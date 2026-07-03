"use server";

import { revalidatePath } from "next/cache";
import {
  DEFAULT_LICENSE_PRICES,
  LICENSE_TYPES,
  STORAGE_BUCKETS,
} from "@/lib/constants";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  getFileExtension,
  parseTags,
  removeBeatFiles,
  uploadBeatBuffer,
  uploadBeatFile,
  downloadBeatBuffer,
} from "@/lib/admin/storage";
import {
  generateWatermarkedPreview,
  getWatermarkTagPath,
} from "@/lib/audio/watermark";
import { slugify } from "@/lib/utils";
import type { BeatStatus } from "@/types";

async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const { data } = await supabase
      .from("beats")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

function getFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (value instanceof File && value.size > 0) return value;
  return null;
}

async function regeneratePreviewFromStoredMp3(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  beatId: string,
  mp3Path: string,
): Promise<string> {
  const mp3Buffer = await downloadBeatBuffer(
    supabase,
    STORAGE_BUCKETS.beats,
    mp3Path,
  );
  const previewPath = `${beatId}/preview.mp3`;
  const previewBuffer = await generateWatermarkedPreview(
    mp3Buffer,
    getWatermarkTagPath(),
  );
  await uploadBeatBuffer(
    supabase,
    STORAGE_BUCKETS.previews,
    previewPath,
    previewBuffer,
    "audio/mpeg",
  );
  return previewPath;
}

export async function createBeat(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const bpm = Number(formData.get("bpm"));
  const musicalKey = String(formData.get("musicalKey") ?? "").trim();
  const genreSelect = String(formData.get("genre") ?? "").trim();
  const genreCustom = String(formData.get("genreCustom") ?? "").trim();
  const genre =
    genreSelect === "Autre" ? genreCustom : genreSelect;
  const mood = String(formData.get("mood") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const durationSeconds = Number(formData.get("durationSeconds"));
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as BeatStatus;

  const coverFile = getFile(formData, "cover");
  const mp3File = getFile(formData, "mp3");
  const wavFile = getFile(formData, "wav");
  const stemsFile = getFile(formData, "stemsZip");

  if (!title) return { error: "Le titre est requis." };
  if (!bpm || bpm < 1 || bpm > 300) return { error: "BPM invalide." };
  if (!musicalKey || !genre || !mood)
    return { error: "Tonalité, genre et mood sont requis." };
  if (genreSelect === "Autre" && !genreCustom)
    return { error: "Précisez le genre personnalisé." };
  if (!durationSeconds || durationSeconds < 1)
    return { error: "Durée invalide (en secondes)." };
  if (!coverFile) return { error: "La cover est requise." };
  if (!mp3File)
    return {
      error:
        "Le MP3 est requis. La preview filigranée sera générée automatiquement.",
    };
  if (status === "published" && (!mp3File || !wavFile))
    return {
      error: "MP3 et WAV requis pour publier. Enregistrez en brouillon sinon.",
    };

  const slug = await ensureUniqueSlug(supabase, slugify(title) || "beat");

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .insert({
      title,
      slug,
      description: description || null,
      bpm,
      musical_key: musicalKey,
      genre,
      mood,
      tags: parseTags(tagsRaw),
      duration_seconds: durationSeconds,
      status: status === "published" ? "published" : "draft",
      producer_id: user.id,
    })
    .select("id")
    .single();

  if (beatError || !beat) {
    return { error: beatError?.message ?? "Impossible de créer le beat." };
  }

  const beatId = beat.id;

  try {
    const coverPath = `${beatId}/cover${getFileExtension(coverFile.name)}`;
    const previewPath = `${beatId}/preview.mp3`;

    await uploadBeatFile(
      supabase,
      STORAGE_BUCKETS.covers,
      coverPath,
      coverFile,
    );

    const mp3Buffer = Buffer.from(await mp3File.arrayBuffer());
    const previewBuffer = await generateWatermarkedPreview(
      mp3Buffer,
      getWatermarkTagPath(),
    );
    await uploadBeatBuffer(
      supabase,
      STORAGE_BUCKETS.previews,
      previewPath,
      previewBuffer,
      "audio/mpeg",
    );

    const licenseFiles: Record<string, File | null> = {
      mp3: mp3File,
      wav: wavFile,
      stems: stemsFile,
    };

    const licensePaths: Record<string, string | null> = {
      mp3: null,
      wav: null,
      stems: null,
      exclusive: null,
    };

    for (const [type, file] of Object.entries(licenseFiles)) {
      if (!file) continue;
      const path = `${beatId}/${type}${getFileExtension(file.name)}`;
      await uploadBeatFile(supabase, STORAGE_BUCKETS.beats, path, file);
      licensePaths[type] = path;
    }

    if (licensePaths.stems) {
      licensePaths.exclusive = licensePaths.stems;
    }

    const { error: updateError } = await supabase
      .from("beats")
      .update({ cover_path: coverPath, preview_path: previewPath })
      .eq("id", beatId);

    if (updateError) throw new Error(updateError.message);

    const licenses = LICENSE_TYPES.map((licenseType) => {
      const storagePath = licensePaths[licenseType];
      const isExclusive = licenseType === "exclusive";
      const isAvailable = isExclusive
        ? Boolean(licensePaths.mp3 && licensePaths.wav)
        : Boolean(storagePath);

      return {
        beat_id: beatId,
        license_type: licenseType,
        price_cents: DEFAULT_LICENSE_PRICES[licenseType],
        storage_path: storagePath,
        is_available: isAvailable,
      };
    });

    const { error: licensesError } = await supabase
      .from("beat_licenses")
      .insert(licenses);

    if (licensesError) throw new Error(licensesError.message);
  } catch (uploadError) {
    await supabase.from("beats").delete().eq("id", beatId);
    await removeBeatFiles(supabase, beatId);
    const message =
      uploadError instanceof Error ? uploadError.message : "Upload échoué.";
    return { error: message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/beats");
  return { success: true };
}

export async function updateBeat(beatId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const bpm = Number(formData.get("bpm"));
  const musicalKey = String(formData.get("musicalKey") ?? "").trim();
  const genreSelect = String(formData.get("genre") ?? "").trim();
  const genreCustom = String(formData.get("genreCustom") ?? "").trim();
  const genre = genreSelect === "Autre" ? genreCustom : genreSelect;
  const mood = String(formData.get("mood") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const durationSeconds = Number(formData.get("durationSeconds"));
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as BeatStatus;
  const isFeatured = formData.get("isFeatured") === "true";

  const coverFile = getFile(formData, "cover");
  const mp3File = getFile(formData, "mp3");
  const wavFile = getFile(formData, "wav");
  const stemsFile = getFile(formData, "stemsZip");

  if (!title) return { error: "Le titre est requis." };
  if (!bpm || bpm < 1 || bpm > 300) return { error: "BPM invalide." };
  if (!musicalKey || !genre || !mood)
    return { error: "Tonalité, genre et mood sont requis." };
  if (!durationSeconds || durationSeconds < 1)
    return { error: "Durée invalide." };

  const { data: existing } = await supabase
    .from("beats")
    .select("*, beat_licenses(*)")
    .eq("id", beatId)
    .single();

  if (!existing) return { error: "Beat introuvable." };
  if (existing.status === "sold_exclusive")
    return { error: "Beat exclusive vendu — modification limitée." };

  try {
    let coverPath = existing.cover_path;
    let previewPath = existing.preview_path;

    if (coverFile) {
      coverPath = `${beatId}/cover${getFileExtension(coverFile.name)}`;
      await uploadBeatFile(
        supabase,
        STORAGE_BUCKETS.covers,
        coverPath,
        coverFile,
      );
    }

    if (mp3File) {
      const mp3Buffer = Buffer.from(await mp3File.arrayBuffer());
      previewPath = `${beatId}/preview.mp3`;
      const previewBuffer = await generateWatermarkedPreview(
        mp3Buffer,
        getWatermarkTagPath(),
      );
      await uploadBeatBuffer(
        supabase,
        STORAGE_BUCKETS.previews,
        previewPath,
        previewBuffer,
        "audio/mpeg",
      );

      const mp3Path = `${beatId}/mp3${getFileExtension(mp3File.name)}`;
      await uploadBeatFile(supabase, STORAGE_BUCKETS.beats, mp3Path, mp3File);
      await supabase
        .from("beat_licenses")
        .update({ storage_path: mp3Path, is_available: true })
        .eq("beat_id", beatId)
        .eq("license_type", "mp3");
    } else if (formData.get("regeneratePreview") === "true") {
      const mp3License = existing.beat_licenses?.find(
        (l: { license_type: string }) => l.license_type === "mp3",
      );
      const mp3Path = mp3License?.storage_path;

      if (mp3Path) {
        previewPath = await regeneratePreviewFromStoredMp3(
          supabase,
          beatId,
          mp3Path,
        );
      }
    }

    if (wavFile) {
      const wavPath = `${beatId}/wav${getFileExtension(wavFile.name)}`;
      await uploadBeatFile(supabase, STORAGE_BUCKETS.beats, wavPath, wavFile);
      await supabase
        .from("beat_licenses")
        .update({ storage_path: wavPath, is_available: true })
        .eq("beat_id", beatId)
        .eq("license_type", "wav");
    }

    if (stemsFile) {
      const stemsPath = `${beatId}/stems${getFileExtension(stemsFile.name)}`;
      await uploadBeatFile(
        supabase,
        STORAGE_BUCKETS.beats,
        stemsPath,
        stemsFile,
      );
      await supabase
        .from("beat_licenses")
        .update({ storage_path: stemsPath, is_available: true })
        .eq("beat_id", beatId)
        .eq("license_type", "stems");
      await supabase
        .from("beat_licenses")
        .update({ storage_path: stemsPath, is_available: true })
        .eq("beat_id", beatId)
        .eq("license_type", "exclusive");
    }

    const { error } = await supabase
      .from("beats")
      .update({
        title,
        description: description || null,
        bpm,
        musical_key: musicalKey,
        genre,
        mood,
        tags: parseTags(tagsRaw),
        duration_seconds: durationSeconds,
        status: status === "published" ? "published" : "draft",
        is_featured: isFeatured,
        cover_path: coverPath,
        preview_path: previewPath,
      })
      .eq("id", beatId);

    if (error) throw new Error(error.message);

    const { data: updatedLicenses } = await supabase
      .from("beat_licenses")
      .select("*")
      .eq("beat_id", beatId);

    if (updatedLicenses) {
      const canExclusive =
        updatedLicenses.some(
          (l) => l.license_type === "mp3" && l.storage_path && l.is_available,
        ) &&
        updatedLicenses.some(
          (l) => l.license_type === "wav" && l.storage_path && l.is_available,
        );

      await supabase
        .from("beat_licenses")
        .update({ is_available: canExclusive })
        .eq("beat_id", beatId)
        .eq("license_type", "exclusive");
    }

    revalidatePath("/");
  revalidatePath("/admin");
    revalidatePath("/beats");
    revalidatePath(`/beats/${existing.slug}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mise à jour échouée.";
    return { error: message };
  }
}

export async function updateBeatStatus(beatId: string, status: BeatStatus) {
  try {
    const { supabase } = await requireAdmin();

    const { data: beat } = await supabase
      .from("beats")
      .select("status")
      .eq("id", beatId)
      .single();

    if (!beat) return { error: "Beat introuvable." };
    if (beat.status === "sold_exclusive")
      return { error: "Beat exclusive vendu — statut verrouillé." };
    if (status === "sold_exclusive")
      return { error: "Statut exclusive réservé aux ventes." };

    const { error } = await supabase
      .from("beats")
      .update({ status })
      .eq("id", beatId);

    if (error) return { error: error.message };

    revalidatePath("/");
  revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { error: message };
  }
}

export async function regenerateBeatPreview(beatId: string) {
  try {
    const { supabase } = await requireAdmin();

    const { data: existing } = await supabase
      .from("beats")
      .select("*, beat_licenses(*)")
      .eq("id", beatId)
      .single();

    if (!existing) return { error: "Beat introuvable." };

    const mp3License = existing.beat_licenses?.find(
      (l: { license_type: string }) => l.license_type === "mp3",
    );
    const mp3Path = mp3License?.storage_path;

    if (!mp3Path) {
      return { error: "Aucun MP3 source trouvé pour ce beat." };
    }

    const previewPath = await regeneratePreviewFromStoredMp3(
      supabase,
      beatId,
      mp3Path,
    );

    const { error } = await supabase
      .from("beats")
      .update({
        preview_path: previewPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", beatId);

    if (error) return { error: error.message };

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/beats/${existing.slug}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { error: message };
  }
}

export async function deleteBeat(beatId: string) {
  try {
    const { supabase } = await requireAdmin();

    const { data: beat } = await supabase
      .from("beats")
      .select("status")
      .eq("id", beatId)
      .single();

    if (!beat) return { error: "Beat introuvable." };
    if (beat.status === "sold_exclusive")
      return { error: "Impossible de supprimer un beat exclusive vendu." };

    const { count } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("beat_id", beatId);

    if (count && count > 0)
      return { error: "Impossible de supprimer — des achats existent." };

    await removeBeatFiles(supabase, beatId);

    const { error } = await supabase.from("beats").delete().eq("id", beatId);

    if (error) return { error: error.message };

    revalidatePath("/");
  revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { error: message };
  }
}
