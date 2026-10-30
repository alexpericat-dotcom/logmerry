import { NextResponse } from "next/server";

import { askClaude } from "@/lib/ai/chat";
import { consumeAiQuota } from "@/lib/ai/quota";
import { retrieveChunks } from "@/lib/db/retrieval";
import { saveExchange } from "@/lib/db/history";
import { quotaMessage } from "@/lib/domain/ai-quota";
import { AnswerRejected } from "@/lib/domain/citations";
import { CHAT_BODY_MAX, answerQuestion } from "@/lib/domain/chat-flow";
import { SENSE_QUERY_MAX } from "@/lib/domain/matching";
import { normalizeQuery } from "@/lib/domain/search";
import { readTextBounded } from "@/lib/read-body";
import { createClient } from "@/lib/supabase/server";

const FAILED = "L'assistant n'a pas pu répondre pour le moment.";
const TOO_LONG = "Question trop longue.";
const REJECTED = "La réponse n'a pas pu être vérifiée par rapport à tes notes, elle n'est pas affichée. Réessaie.";

/** Seul Route Handler de l'application (AD-7) : session, extraits retrouvés sous RLS, réponse de Claude. Pas de flux. */
export async function POST(request: Request) {
  // Première barrière : la taille annoncée (une question tient en 300 caractères) ; puis lecture bornée, car l'en-tête peut manquer ou mentir.
  const announced = Number(request.headers.get("content-length") ?? 0);
  if (announced > CHAT_BODY_MAX) return NextResponse.json({ error: TOO_LONG }, { status: 413 });
  const raw = await readTextBounded(request, CHAT_BODY_MAX).catch(() => "");
  if (raw === null) return NextResponse.json({ error: TOO_LONG }, { status: 413 });
  const body = (() => {
    try {
      return JSON.parse(raw) as { question?: unknown } | null;
    } catch {
      return null;
    }
  })();
  const question = normalizeQuery(typeof body?.question === "string" ? body.question : "", SENSE_QUERY_MAX);
  if (!question) return NextResponse.json({ error: "Écris une question." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return NextResponse.json({ error: "Connecte-toi pour utiliser l'assistant." }, { status: 401 });

    // Plafond d'appels à l'IA par compte : refus avant tout appel à Mistral ou à Claude.
    const quota = await consumeAiQuota(supabase);
    if (quota !== "ok") return NextResponse.json({ error: quotaMessage(quota) }, { status: quota === "error" ? 503 : 429 });

    // Claude ne renvoie que des identifiants : le texte des sources vient des extraits lus en base, pas du modèle.
    const result = await answerQuestion(question, {
      retrieve: (q) => retrieveChunks(supabase, q),
      ask: askClaude,
    });
    // L'enregistrement de l'historique ne bloque jamais la réponse : en cas d'échec, journal sans contenu.
    await saveExchange(supabase, question, result.answer, result.sources).catch((e) =>
      console.error("Historique non enregistré :", e instanceof Error ? e.message : "erreur inconnue"),
    );
    return NextResponse.json(result);
  } catch (e) {
    // Journal sans question ni contenu de note ni clé : seulement la nature de l'échec.
    console.error(e instanceof AnswerRejected ? "Réponse rejetée :" : "Assistant impossible :", e instanceof Error ? e.message : "erreur inconnue");
    return NextResponse.json({ error: e instanceof AnswerRejected ? REJECTED : FAILED }, { status: 502 });
  }
}
