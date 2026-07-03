"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeAudioFile,
  buildDefaultDescription,
} from "@/lib/audio/analyze";
import { GENRES, MOODS, MUSICAL_KEYS } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function BeatForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [genre, setGenre] = useState("");
  const [genreCustom, setGenreCustom] = useState("");
  const [description, setDescription] = useState("");
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const descriptionEdited = useRef(false);

  const slugPreview = useMemo(() => slugify(title) || "mon-beat", [title]);
  const displayGenre = genre === "Autre" ? genreCustom : genre;

  useEffect(() => {
    if (descriptionEdited.current) return;
    setDescription(
      buildDefaultDescription({
        title,
        bpm,
        musicalKey,
        genre: displayGenre,
      }),
    );
  }, [title, bpm, musicalKey, displayGenre]);

  async function handleAudioAnalysis(file: File) {
    setAnalysisNote("Analyse du fichier audio...");
    try {
      const analysis = await analyzeAudioFile(file);
      if (analysis.duration) setDurationSeconds(String(analysis.duration));
      if (analysis.bpm) setBpm(String(analysis.bpm));
      if (analysis.musicalKey) setMusicalKey(analysis.musicalKey);

      if (analysis.source.length > 0) {
        setAnalysisNote(
          `Détecté automatiquement (${analysis.source.join(", ")}). Vérifiez avant publication.`,
        );
      } else {
        setAnalysisNote(
          "Durée/BPM/tonalité non détectés — complétez manuellement si besoin.",
        );
      }
    } catch {
      setAnalysisNote("Analyse impossible — saisissez les valeurs manuellement.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    let totalSize = 0;
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.size > 0) {
        totalSize += value.size;
      }
    }

    if (totalSize > MAX_UPLOAD_BYTES) {
      setError(
        `Fichiers trop volumineux (${formatFileSize(totalSize)}). Maximum : 250 Mo au total.`,
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/beats", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        success?: boolean;
      } | null;

      if (!response.ok || data?.error) {
        setError(
          data?.error ??
            (response.status === 413
              ? "Fichiers trop volumineux (max 250 Mo)."
              : "Erreur lors de la publication."),
        );
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError(
        "Échec de l'envoi des fichiers. Vérifiez leur taille ou réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-8"
    >
      {error && (
        <div className="rounded-lg border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {analysisNote && (
        <div className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
          {analysisNote}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Informations</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm text-muted">
              Titre *
            </label>
            <Input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dark Trap Beat"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm text-muted">
              Slug (URL automatique)
            </label>
            <Input value={slugPreview} readOnly disabled className="opacity-60" />
            <HelpText>
              C&apos;est l&apos;adresse web du beat, ex.{" "}
              <span className="text-foreground">/beats/{slugPreview}</span>.
              Généré depuis le titre, modifiable plus tard si besoin.
            </HelpText>
          </div>

          <div>
            <label htmlFor="bpm" className="mb-1.5 block text-sm text-muted">
              BPM *
            </label>
            <Input
              id="bpm"
              name="bpm"
              type="number"
              min={1}
              max={300}
              required
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="140"
            />
            <HelpText>Rempli auto depuis le MP3 (tags, nom ou analyse).</HelpText>
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
              min={1}
              required
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              placeholder="180"
            />
            <HelpText>
              {durationSeconds
                ? `≈ ${Math.floor(Number(durationSeconds) / 60)}:${String(Number(durationSeconds) % 60).padStart(2, "0")}`
                : "Rempli auto depuis le fichier audio."}
            </HelpText>
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
              value={musicalKey}
              onChange={(e) => setMusicalKey(e.target.value)}
            >
              <option value="" disabled>
                Choisir
              </option>
              {MUSICAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
            <HelpText>Détectée si présente dans les tags du fichier.</HelpText>
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
              <option value="" disabled>
                Choisir
              </option>
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
                placeholder="Ex. Hyperpop, Jersey Club..."
              />
            </div>
          )}

          <div>
            <label htmlFor="mood" className="mb-1.5 block text-sm text-muted">
              Mood *
            </label>
            <Select id="mood" name="mood" required defaultValue="">
              <option value="" disabled>
                Choisir
              </option>
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
            <Select id="status" name="status" defaultValue="draft">
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="tags" className="mb-1.5 block text-sm text-muted">
              Tags (optionnel)
            </label>
            <Input id="tags" name="tags" placeholder="trap, dark, hard" />
            <HelpText>
              Utile pour la recherche et plus tard pour YouTube / réseaux. Pas
              obligatoire si genre + mood suffisent.
            </HelpText>
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
              value={description}
              onChange={(e) => {
                descriptionEdited.current = true;
                setDescription(e.target.value);
              }}
            />
            <HelpText>
              Pré-remplie automatiquement — modifiable à tout moment.
            </HelpText>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Fichiers</h2>
        <div className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
          La preview filigranée est générée automatiquement depuis le MP3 avec
          votre tag vocal (toutes les 20 secondes). Plus besoin d&apos;uploader
          un MP3 séparé.
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cover" className="mb-1.5 block text-sm text-muted">
              Cover (image carrée) *
            </label>
            <Input
              id="cover"
              name="cover"
              type="file"
              accept="image/*"
              required
            />
          </div>
          <div>
            <label htmlFor="mp3" className="mb-1.5 block text-sm text-muted">
              MP3 propre (29 €) *
            </label>
            <Input
              id="mp3"
              name="mp3"
              type="file"
              accept="audio/mpeg,.mp3"
              required
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleAudioAnalysis(file);
              }}
            />
            <HelpText>
              Fichier sans tag — livré à l&apos;acheteur. Sert aussi à créer la
              preview filigranée.
            </HelpText>
          </div>
          <div>
            <label htmlFor="wav" className="mb-1.5 block text-sm text-muted">
              WAV (49 €)
            </label>
            <Input id="wav" name="wav" type="file" accept="audio/wav,.wav" />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="stemsZip"
              className="mb-1.5 block text-sm text-muted"
            >
              Stems + Exclusive (ZIP)
            </label>
            <Input
              id="stemsZip"
              name="stemsZip"
              type="file"
              accept=".zip,.rar"
            />
            <HelpText>ZIP recommandé. Un seul fichier pour Stems et Exclusive.</HelpText>
          </div>
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer le beat"}
      </Button>
    </form>
  );
}
