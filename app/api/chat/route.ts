import { NextResponse } from "next/server";

import { askClaude } from "@/lib/ai/chat";
import { retrieveChunks } from "@/lib/db/retrieval";
import { answerQuestion } from "@/lib/domain/chat-flow";
import { SENSE_QUERY_MAX } from "@/lib/domain/matching";
import { normalizeQuery } from "@/lib/domain/search";
import { createClient } from "@/lib/supabase/server";

const FAILED = "L'assistant n'a pas pu répondre pour le moment.";

/** Seul Route Handler de l'application (AD-7) : session, extraits retrouvés sous RLS, réponse de Claude. Pas de flux. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { question?: unknown } | null;
  const question = normalizeQuery(typeof body?.question === "string" ? body.question : "", SENSE_QUERY_MAX);
  if (!question) return NextResponse.json({ error: "Écris une question." }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return NextResponse.json({ error: "Connecte-toi pour utiliser l'assistant." }, { status: 401 });

    const result = await answerQuestion(question, {
      retrieve: (q) => retrieveChunks(supabase, q),
      ask: askClaude,
    });
    return NextResponse.json(result);
  } catch (e) {
    // Journal sans question ni contenu de note ni clé : seulement la nature de l'échec.
    console.error("Assistant impossible :", e instanceof Error ? e.message : "erreur inconnue");
    return NextResponse.json({ error: FAILED }, { status: 502 });
  }
}
