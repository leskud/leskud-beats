"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  uploadBeatFilesFromBrowser,
  type UploadProgressCallback,
} from "@/lib/admin/client-upload";
import type { BeatFileKind } from "@/lib/admin/beat-paths";
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

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}

function getSelectedFile(form: HTMLFormElement, name: string): File | undefined {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement) || input.type !== "file") {
    return undefined;
  }
  const file = input.files?.[0];
  return file && file.size > 0 ? file : undefined;
}

export function BeatForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  const onUploadProgress: UploadProgressCallback = (message) => {
    setStatusMessage(message);
  };

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
    setStatusMessage(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const cover = getSelectedFile(form, "cover");
    const mp3 = getSelectedFile(form, "mp3");
    const wav = getSelectedFile(form, "wav");
    const stems = getSelectedFile(form, "stemsZip");
    const status = String(new FormData(form).get("status") ?? "draft");

    if (!cover) {
      setError("La cover est requise.");
      setIsSubmitting(false);
      return;
    }

    if (!mp3) {
      setError(
        "Le MP3 est requis. La preview filigranée sera générée automatiquement.",
      );
      setIsSubmitting(false);
      return;
    }

    if (status === "published" && !wav) {
      setError(
        "MP3 et WAV requis pour publier. Enregistrez en brouillon sinon.",
      );
      setIsSubmitting(false);
      return;
    }

    const metadataForm = new FormData();
    for (const [key, value] of new FormData(form).entries()) {
      if (value instanceof File) continue;
      metadataForm.set(key, value);
    }

    try {
      setStatusMessage("Création du beat…");

      const createResponse = await fetch("/api/admin/beats", {
        method: "POST",
        body: metadataForm,
      });

      const createData = (await createResponse.json().catch(() => null)) as {
        error?: string;
        beatId?: string;
      } | null;

      if (!createResponse.ok || !createData?.beatId) {
        setError(createData?.error ?? "Impossible de créer le beat.");
        return;
      }

      const beatId = createData.beatId;
      const filesToUpload: Partial<Record<BeatFileKind, File>> = {
        cover,
        mp3,
      };
      if (wav) filesToUpload.wav = wav;
      if (stems) filesToUpload.stems = stems;

      setStatusMessage("Upload des fichiers (R2 / Supabase)…");

      const uploadedPaths = await uploadBeatFilesFromBrowser(
        beatId,
        filesToUpload,
        onUploadProgress,
      );

      const finalizeForm = new FormData();
      for (const [key, value] of metadataForm.entries()) {
        finalizeForm.set(key, value);
      }

      if (uploadedPaths.cover) {
        finalizeForm.set("uploadedCoverPath", uploadedPaths.cover);
      }
      if (uploadedPaths.mp3) {
        finalizeForm.set("uploadedMp3Path", uploadedPaths.mp3);
      }
      if (uploadedPaths.wav) {
        finalizeForm.set("uploadedWavPath", uploadedPaths.wav);
      }
      if (uploadedPaths.stems) {
        finalizeForm.set("uploadedStemsPath", uploadedPaths.stems);
      }

      setStatusMessage("Finalisation…");

      const finalizeResponse = await fetch(`/api/admin/beats/${beatId}`, {
        method: "PATCH",
        body: finalizeForm,
      });

      const finalizeData = (await finalizeResponse.json().catch(() => null)) as {
        error?: string;
        previewWarning?: string | null;
      } | null;

      if (!finalizeResponse.ok || finalizeData?.error) {
        setError(finalizeData?.error ?? "Finalisation échouée.");
        return;
      }

      if (finalizeData?.previewWarning) {
        setStatusMessage(finalizeData.previewWarning);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Erreur réseau lors de la création.";
      setError(message);
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

      {statusMessage && (
        <div className="rounded-lg border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
          {statusMessage}
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
          Cover → Supabase. MP3, WAV et Stems → Cloudflare R2 (upload direct,
          sans limite Vercel). La preview filigranée est générée côté serveur
          depuis le MP3 ; si elle échoue, le fichier payant reste enregistré.
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
            <HelpText>
              ZIP recommandé. Un seul fichier pour Stems et Exclusive — gros
              fichiers supportés via R2.
            </HelpText>
          </div>
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer le beat"}
      </Button>
    </form>
  );
}
