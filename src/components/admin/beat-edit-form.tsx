"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  uploadBeatFilesFromBrowser,
  type UploadProgressCallback,
} from "@/lib/admin/client-upload";
import type { BeatFileKind } from "@/lib/admin/beat-paths";
import { GENRES, MOODS, MUSICAL_KEYS } from "@/lib/constants";
import type { BeatWithLicenses } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BeatEditFormProps = {
  beat: BeatWithLicenses;
};

function getSelectedFile(form: HTMLFormElement, name: string): File | undefined {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement) || input.type !== "file") {
    return undefined;
  }
  const file = input.files?.[0];
  return file && file.size > 0 ? file : undefined;
}

export function BeatEditForm({ beat }: BeatEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isKnownGenre = GENRES.includes(
    beat.genre as (typeof GENRES)[number],
  );
  const [genre, setGenre] = useState(
    isKnownGenre ? beat.genre : "Autre",
  );
  const [genreCustom, setGenreCustom] = useState(
    isKnownGenre ? "" : beat.genre,
  );

  const onUploadProgress: UploadProgressCallback = (message) => {
    setStatusMessage(message);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const filesToUpload: Partial<Record<BeatFileKind, File>> = {};
      const cover = getSelectedFile(form, "cover");
      const mp3 = getSelectedFile(form, "mp3");
      const wav = getSelectedFile(form, "wav");
      const stems = getSelectedFile(form, "stemsZip");

      if (cover) filesToUpload.cover = cover;
      if (mp3) filesToUpload.mp3 = mp3;
      if (wav) filesToUpload.wav = wav;
      if (stems) filesToUpload.stems = stems;

      const hasLargeUpload = Boolean(wav || stems || mp3);

      if (hasLargeUpload) {
        setStatusMessage("Préparation de l'upload (R2 / Supabase)…");
      }

      const uploadedPaths = await uploadBeatFilesFromBrowser(
        beat.id,
        filesToUpload,
        onUploadProgress,
      );

      formData.delete("cover");
      formData.delete("mp3");
      formData.delete("wav");
      formData.delete("stemsZip");

      if (uploadedPaths.cover) {
        formData.set("uploadedCoverPath", uploadedPaths.cover);
      }
      if (uploadedPaths.mp3) {
        formData.set("uploadedMp3Path", uploadedPaths.mp3);
      }
      if (uploadedPaths.wav) {
        formData.set("uploadedWavPath", uploadedPaths.wav);
      }
      if (uploadedPaths.stems) {
        formData.set("uploadedStemsPath", uploadedPaths.stems);
      }

      if (!formData.get("regeneratePreview") || uploadedPaths.mp3) {
        formData.delete("regeneratePreview");
      }

      setStatusMessage("Enregistrement des métadonnées…");

      const response = await fetch(`/api/admin/beats/${beat.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        previewWarning?: string | null;
        successMessage?: string | null;
      } | null;

      if (!response.ok || data?.error) {
        setError(data?.error ?? "Mise à jour échouée.");
        return;
      }

      const successText =
        data?.successMessage ??
        (uploadedPaths.stems && !uploadedPaths.mp3 && !uploadedPaths.wav
          ? "Stems mis à jour."
          : "Upload terminé — beat mis à jour.");

      if (data?.previewWarning) {
        setStatusMessage(`${successText} ${data.previewWarning}`);
        router.push("/admin");
        router.refresh();
        return;
      }

      setStatusMessage(successText);
      router.push("/admin");
      router.refresh();
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Erreur réseau lors de la mise à jour.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSoldExclusive = beat.status === "sold_exclusive";

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">
      {isSoldExclusive && (
        <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          Beat vendu en Exclusive : il reste masqué du catalogue, mais vous
          pouvez mettre à jour les fichiers livrables (MP3, WAV, Stems, cover).
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
          {statusMessage}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Informations</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm text-muted">
              Titre *
            </label>
            <Input id="title" name="title" required defaultValue={beat.title} />
          </div>

          <div>
            <label htmlFor="bpm" className="mb-1.5 block text-sm text-muted">
              BPM *
            </label>
            <Input
              id="bpm"
              name="bpm"
              type="number"
              required
              defaultValue={beat.bpm}
            />
          </div>

          <div>
            <label
              htmlFor="durationSeconds"
              className="mb-1.5 block text-sm text-muted"
            >
              Durée (secondes) *
            </label>
            <Input
              id="durationSeconds"
              name="durationSeconds"
              type="number"
              required
              defaultValue={beat.duration_seconds}
            />
          </div>

          <div>
            <label
              htmlFor="musicalKey"
              className="mb-1.5 block text-sm text-muted"
            >
              Tonalité *
            </label>
            <Select
              id="musicalKey"
              name="musicalKey"
              required
              defaultValue={beat.musical_key}
            >
              {MUSICAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="genre" className="mb-1.5 block text-sm text-muted">
              Genre *
            </label>
            <Select
              id="genre"
              name="genre"
              required
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>

          {genre === "Autre" && (
            <div className="sm:col-span-2">
              <label
                htmlFor="genreCustom"
                className="mb-1.5 block text-sm text-muted"
              >
                Précisez le genre *
              </label>
              <Input
                id="genreCustom"
                name="genreCustom"
                required
                value={genreCustom}
                onChange={(e) => setGenreCustom(e.target.value)}
              />
            </div>
          )}

          <div>
            <label htmlFor="mood" className="mb-1.5 block text-sm text-muted">
              Mood *
            </label>
            <Select id="mood" name="mood" required defaultValue={beat.mood}>
              {MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm text-muted">
              Statut *
            </label>
            {isSoldExclusive ? (
              <>
                <Input
                  id="status"
                  value="Exclusive vendu"
                  readOnly
                  disabled
                  className="opacity-70"
                />
                <input type="hidden" name="status" value="sold_exclusive" />
              </>
            ) : (
              <Select id="status" name="status" defaultValue={beat.status}>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </Select>
            )}
          </div>

          {!isSoldExclusive && (
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isFeatured"
                  value="true"
                  defaultChecked={beat.is_featured}
                />
                Beat du moment (homepage)
              </label>
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="tags" className="mb-1.5 block text-sm text-muted">
              Tags
            </label>
            <Input
              id="tags"
              name="tags"
              defaultValue={beat.tags.join(", ")}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm text-muted"
            >
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={beat.description ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Remplacer des fichiers (optionnel)</h2>
        <p className="text-sm text-muted">
          Cover → Supabase Storage. MP3, WAV et Stems → Cloudflare R2 (contourne
          la limite Vercel). Laissez vide pour conserver les fichiers actuels.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="regeneratePreview"
            value="true"
          />
          Régénérer la preview filigranée depuis le MP3 existant (sans re-uploader le MP3)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="cover" type="file" accept="image/*" />
          <Input name="mp3" type="file" accept="audio/mpeg,.mp3" />
          <Input name="wav" type="file" accept="audio/wav,.wav" />
          <Input name="stemsZip" type="file" accept=".zip,application/zip" />
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement…" : "Enregistrer les modifications"}
      </Button>
    </form>
  );
}
