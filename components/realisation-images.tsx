"use client";

import { useRef, useState, useTransition } from "react";

import { addRealisationImage, deleteRealisationImage } from "@/app/(app)/realisations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IMAGE_MAX_PER_REALISATION, IMAGE_TYPES, imageFileProblem, imagePath, publicImageUrl, type ImageMime } from "@/lib/domain/realisation-images";
import { createClient } from "@/lib/supabase/client";

type Image = { id: string; path: string; alt: string };

/**
 * Captures d'une réalisation : l'image part du navigateur vers le stockage (session de l'utilisateur, politiques du bucket `portfolio`), puis
 * l'action serveur enregistre son chemin et son texte alternatif (obligatoire). Le nom du fichier envoyé n'est jamais gardé.
 */
export function RealisationImages({ realisationId, ownerId, supabaseUrl, images }: { realisationId: string; ownerId: string; supabaseUrl: string; images: Image[] }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const full = images.length >= IMAGE_MAX_PER_REALISATION;

  const upload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMessage("Choisis une image.");
    const problem = imageFileProblem(file);
    if (problem) return setMessage(problem);
    startTransition(async () => {
      setMessage("");
      const path = imagePath(ownerId, realisationId, crypto.randomUUID(), file.type as ImageMime);
      const supabase = createClient();
      const sent = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type, upsert: false });
      if (sent.error) return setMessage("L'envoi de l'image a échoué. Réessaie.");
      const saved = await addRealisationImage(realisationId, path, altRef.current?.value ?? "");
      if (saved.message) {
        // Le texte alternatif manquait ou la base a refusé : le fichier envoyé ne doit pas rester sans ligne.
        await supabase.storage.from("portfolio").remove([path]);
        return setMessage(saved.message);
      }
      if (fileRef.current) fileRef.current.value = "";
      if (altRef.current) altRef.current.value = "";
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      const done = await deleteRealisationImage(id);
      setMessage(done.message ?? "");
    });

  return (
    <section aria-labelledby="images-title" className="flex max-w-2xl flex-col gap-4 rounded-lg border p-4">
      <h2 id="images-title" className="font-semibold">
        Captures d&apos;écran ({images.length}/{IMAGE_MAX_PER_REALISATION})
      </h2>
      {images.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image) => (
            <li key={image.id} className="flex flex-col gap-2 rounded-md border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu du propriétaire ; la page publique utilisera next/image */}
              <img src={publicImageUrl(supabaseUrl, image.path)} alt={image.alt} loading="lazy" className="aspect-video w-full rounded object-cover" />
              <p className="break-words text-sm text-muted-foreground">{image.alt}</p>
              <Button type="button" variant="outline" size="sm" className="self-start text-destructive" disabled={pending} onClick={() => remove(image.id)}>
                Supprimer cette capture<span className="sr-only"> : {image.alt}</span>
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
            <Input id="image-alt" ref={altRef} autoComplete="off" />
          </div>
          <Button type="button" className="self-start" disabled={pending} onClick={upload}>
            {pending ? "Un instant…" : "Ajouter la capture"}
          </Button>
        </div>
      )}
      <p role="alert" className="min-h-5 text-sm text-destructive">
        {message}
      </p>
    </section>
  );
}
