"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GENRES, MOODS, MUSICAL_KEYS } from "@/lib/constants";
import type { BeatWithLicenses } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BeatEditFormProps = {
  beat: BeatWithLicenses;
};

export function BeatEditForm({ beat }: BeatEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isKnownGenre = GENRES.includes(
    beat.genre as (typeof GENRES)[number],
  );
  const [genre, setGenre] = useState(
    isKnownGenre ? beat.genre : "Autre",
  );
  const [genreCustom, setGenreCustom] = useState(
    isKnownGenre ? "" : beat.genre,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/admin/beats/${beat.id}`, {
        method: "PATCH",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok || data?.error) {
        setError(data?.error ?? "Mise à jour échouée.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erreur réseau lors de la mise à jour.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
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
            <Select id="status" name="status" defaultValue={beat.status}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </Select>
          </div>

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
          Laissez vide pour conserver les fichiers actuels. Si vous changez le
          MP3, la preview filigranée sera régénérée automatiquement.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="regeneratePreview"
            value="true"
            defaultChecked
          />
          Régénérer la preview filigranée (sans re-uploader le MP3)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="cover" type="file" accept="image/*" />
          <Input name="mp3" type="file" accept="audio/mpeg,.mp3" />
          <Input name="wav" type="file" accept="audio/wav,.wav" />
          <Input name="stemsZip" type="file" accept=".zip,.rar" />
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Mise à jour..." : "Enregistrer les modifications"}
      </Button>
    </form>
  );
}
