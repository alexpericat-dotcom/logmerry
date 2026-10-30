"use client";

import { useRef, useState, useTransition } from "react";

import { addRealisationImage, deleteRealisationImage } from "@/app/(app)/realisations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IMAGE_MAX_PER_REALISATION, IMAGE_TYPES, imageFileProblem, imagePath, publicImageUrl, validateAlt, type ImageMime } from "@/lib/domain/realisation-images";
import { createClient } from "@/lib/supabase/client";

type Image = { id: string; path: string; alt: string };

/**
 * Captures d'une réalisation : l'image part du navigateur vers le stockage (session de l'utilisateur, politiques du bucket `portfolio`), puis
 * l'action serveur enregistre son chemin et son texte alternatif (obligatoire, contrôlé AVANT l'envoi). Le nom du fichier envoyé n'est jamais gardé.
 */
export function RealisationImages({ realisationId, ownerId, supabaseUrl, images }: { realisationId: string; ownerId: string; supabaseUrl: string; images: Image[] }) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Deux clics dans le même tick passent avant le rendu qui désactive le bouton : la garde est une ref.
  const busy = useRef(false);
  const full = images.length >= IMAGE_MAX_PER_REALISATION;

  const fail = (message: string) => {
    setStatus("");
    setError(message);
  };

  const upload = () => {
    if (busy.current) return;
    const file = fileRef.current?.files?.[0];
    if (!file) return fail("Choisis une image.");
    const problem = imageFileProblem(file);
    if (problem) return fail(problem);
    // Texte alternatif lu et contrôlé avant l'envoi : un fichier de 3 Mo ne part pas pour être refusé ensuite.
    const alt = validateAlt(altRef.current?.value ?? "");
    if (!alt.ok) {
      altRef.current?.focus();
      return fail(alt.error);
    }
    busy.current = true;
    startTransition(async () => {
      setError("");
      setStatus("");
      const supabase = createClient();
      const path = imagePath(ownerId, realisationId, crypto.randomUUID(), file.type as ImageMime);
      let sent = false;
      try {
        const up = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) return fail("L'envoi de l'image a échoué. Réessaie.");
        sent = true;
        const saved = await addRealisationImage(realisationId, path, alt.value);
        if (saved.message) return fail(saved.message);
        sent = false; // enregistrée : le fichier a sa ligne
        if (fileRef.current) fileRef.current.value = "";
        if (altRef.current) altRef.current.value = "";
        setStatus("Capture ajoutée.");
      } catch {
        // Session expirée (redirection), réseau coupé, action en échec : le fichier envoyé ne doit pas rester sans ligne.
        fail("L'ajout a échoué. Recharge la page et réessaie.");
      } finally {
        if (sent) await supabase.storage.from("portfolio").remove([path]).catch(() => undefined);
        busy.current = false;
      }
    });
  };

  const remove = (id: string) => {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const done = await deleteRealisationImage(id);
        if (done.message) fail(done.message);
        else {
          setError("");
          setStatus("Capture supprimée.");
        }
      } catch {
        fail("Suppression impossible. Recharge la page et réessaie.");
      } finally {
        busy.current = false;
        // Le bouton supprimé disparaît : le focus revient au titre de la section au lieu de tomber sur la page.
        titleRef.current?.focus();
      }
    });
  };

  return (
    <section aria-labelledby="images-title" className="flex max-w-2xl flex-col gap-4 rounded-lg border p-4">
      <h2 id="images-title" ref={titleRef} tabIndex={-1} className="font-semibold outline-none">
        Captures d&apos;écran ({images.length}/{IMAGE_MAX_PER_REALISATION})
      </h2>
      <p className="text-sm text-muted-foreground">
        Une capture est lisible par quiconque connaît son adresse dès son envoi, même si la réalisation n&apos;est pas publiée, et reste accessible tant que son fichier existe.
        N&apos;envoie que des images destinées à être publiques (sans donnée du client sans son accord). Ajouter ou supprimer une capture d&apos;une réalisation publiée la remet « non publiée ».
      </p>
      {images.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image) => (
            <li key={image.id} className="flex flex-col gap-2 rounded-md border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu du propriétaire ; la page publique utilisera next/image */}
              <img src={publicImageUrl(supabaseUrl, image.path)} alt={image.alt} loading="lazy" className="aspect-video w-full rounded object-cover" />
              {/* Légende visuelle du texte alternatif : masquée aux lecteurs d'écran, qui lisent déjà l'alternative de l'image. */}
              <p aria-hidden="true" className="break-words text-sm text-muted-foreground">
                {image.alt}
              </p>
              <Button type="button" variant="outline" size="sm" className="self-start text-destructive" disabled={pending} onClick={() => remove(image.id)}>
                Supprimer cette capture<span className="sr-only">: {image.alt}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-muted-foreground">Six captures au plus. Supprime-en une pour en ajouter une autre.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="image-file">Image (PNG, JPEG ou WebP, 3 Mo au plus)</Label>
            <Input id="image-file" ref={fileRef} type="file" accept={Object.keys(IMAGE_TYPES).join(",")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image-alt">Texte alternatif (obligatoire) : ce que montre l&apos;image</Label>
            <Input id="image-alt" ref={altRef} autoComplete="off" aria-describedby={error ? "images-error" : undefined} aria-invalid={error && /alternatif/i.test(error) ? true : undefined} />
          </div>
          <Button type="button" className="self-start" disabled={pending} onClick={upload}>
            {pending ? "Un instant…" : "Ajouter la capture"}
          </Button>
        </div>
      )}
      <p id="images-error" role="alert" className="min-h-5 text-sm text-destructive">
        {error}
      </p>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {status}
      </p>
    </section>
  );
}
