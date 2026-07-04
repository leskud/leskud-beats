"use server";

import { revalidatePath } from "next/cache";
import {
  DEFAULT_LICENSE_PRICES,
  LICENSE_TYPES,
  STORAGE_BUCKETS,
} from "@/lib/constants";
import { requireAdmin } from "@/lib/admin/require-admin";
import { resolveCoverPath } from "@/lib/admin/beat-paths";
import {
  parseTags,
  removeBeatFiles,
  uploadBeatBuffer,
  uploadBeatFile,
  downloadBeatBuffer,
} from "@/lib/admin/storage";
import {
  generateWatermarkedPreview,
} from "@/lib/audio/watermark";
import {
  NO_PREVIEW_PLAYER_MESSAGE,
  PREVIEW_GENERATED_MESSAGE,
  PREVIEW_SKIPPED_MESSAGE,
} from "@/lib/audio/preview-messages";
import { previewLog, previewLogError } from "@/lib/audio/preview-log";
import { isPreviewGenerationEnabled } from "@/lib/config/env";
import { downloadR2ObjectBuffer } from "@/lib/storage/r2-presign";
import {
  normalizeStorageProvider,
  type StorageProvider,
} from "@/lib/storage/types";
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

function getUploadedPath(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

type AdminSupabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

const PAID_STORAGE_PROVIDER = "r2" as const;

function paidLicensePatch(path: string, keepUnavailable: boolean) {
  const base = {
    storage_path: path,
    storage_provider: PAID_STORAGE_PROVIDER,
  };
  return keepUnavailable ? base : { ...base, is_available: true };
}

async function downloadPaidMp3Buffer(
  supabase: AdminSupabase,
  mp3Path: string,
  provider: StorageProvider,
): Promise<Buffer> {
  if (provider === "r2") {
    return downloadR2ObjectBuffer(mp3Path);
  }

  return downloadBeatBuffer(supabase, STORAGE_BUCKETS.beats, mp3Path);
}

async function syncStemsLicensePaths(
  supabase: AdminSupabase,
  beatId: string,
  stemsPath: string,
  keepUnavailable = false,
) {
  const patch = paidLicensePatch(stemsPath, keepUnavailable);

  for (const licenseType of ["stems", "unlimited", "exclusive"] as const) {
    await supabase
      .from("beat_licenses")
      .update(patch)
      .eq("beat_id", beatId)
      .eq("license_type", licenseType);
  }
}

async function refreshBeatLicenseAvailability(
  supabase: AdminSupabase,
  beatId: string,
) {
  const { data: updatedLicenses } = await supabase
    .from("beat_licenses")
    .select("*")
    .eq("beat_id", beatId);

  if (!updatedLicenses) return;

  const hasStems = updatedLicenses.some(
    (l) => l.license_type === "stems" && l.storage_path && l.is_available,
  );

  await supabase
    .from("beat_licenses")
    .update({ is_available: false })
    .eq("beat_id", beatId)
    .eq("license_type", "exclusive");

  await supabase
    .from("beat_licenses")
    .update({ is_available: hasStems })
    .eq("beat_id", beatId)
    .eq("license_type", "unlimited");
}

type ApplyMp3Result = {
  previewPath: string | null;
  previewWarning: string | null;
  previewGenerated: boolean;
};

async function generatePreviewFromMp3Buffer(
  supabase: AdminSupabase,
  beatId: string,
  mp3Buffer: Buffer,
): Promise<ApplyMp3Result> {
  const previewEnabled = isPreviewGenerationEnabled();

  previewLog("admin_preview_attempt", {
    beat_id: beatId,
    preview_enabled: previewEnabled,
    source_mp3_bytes: mp3Buffer.byteLength,
  });

  if (!previewEnabled) {
    previewLog("admin_preview_disabled", { beat_id: beatId });
    return {
      previewPath: null,
      previewWarning: PREVIEW_SKIPPED_MESSAGE,
      previewGenerated: false,
    };
  }

  const previewTarget = `${beatId}/preview.mp3`;

  try {
    const previewBuffer = await generateWatermarkedPreview(mp3Buffer, beatId);
    await uploadBeatBuffer(
      supabase,
      STORAGE_BUCKETS.previews,
      previewTarget,
      previewBuffer,
      "audio/mpeg",
    );
    previewLog("admin_preview_uploaded", {
      beat_id: beatId,
      preview_path: previewTarget,
      preview_bytes: previewBuffer.byteLength,
    });
    return {
      previewPath: previewTarget,
      previewWarning: null,
      previewGenerated: true,
    };
  } catch (error) {
    previewLogError("admin_preview_failed", error, { beat_id: beatId });
    return {
      previewPath: null,
      previewWarning: PREVIEW_SKIPPED_MESSAGE,
      previewGenerated: false,
    };
  }
}

async function applyMp3Upload(
  supabase: AdminSupabase,
  beatId: string,
  mp3Path: string,
  keepUnavailable = false,
): Promise<ApplyMp3Result> {
  await supabase
    .from("beat_licenses")
    .update(paidLicensePatch(mp3Path, keepUnavailable))
    .eq("beat_id", beatId)
    .eq("license_type", "mp3");

  try {
    previewLog("admin_mp3_r2_download_start", { beat_id: beatId, mp3_path: mp3Path });
    const mp3Buffer = await downloadR2ObjectBuffer(mp3Path);
    previewLog("admin_mp3_r2_download_ok", {
      beat_id: beatId,
      source_mp3_downloaded: true,
      source_mp3_bytes: mp3Buffer.byteLength,
    });
    return await generatePreviewFromMp3Buffer(supabase, beatId, mp3Buffer);
  } catch (error) {
    previewLogError("admin_mp3_or_preview_failed", error, {
      beat_id: beatId,
      mp3_path: mp3Path,
    });
    return {
      previewPath: null,
      previewWarning: PREVIEW_SKIPPED_MESSAGE,
      previewGenerated: false,
    };
  }
}

async function tryRegeneratePreviewFromStoredMp3(
  supabase: AdminSupabase,
  beatId: string,
  mp3Path: string,
  provider: StorageProvider,
): Promise<ApplyMp3Result> {
  if (!isPreviewGenerationEnabled()) {
    previewLog("admin_preview_disabled", { beat_id: beatId });
    return {
      previewPath: null,
      previewWarning: PREVIEW_SKIPPED_MESSAGE,
      previewGenerated: false,
    };
  }

  try {
    previewLog("admin_mp3_source_download_start", {
      beat_id: beatId,
      mp3_path: mp3Path,
      storage_provider: provider,
    });
    const mp3Buffer = await downloadPaidMp3Buffer(supabase, mp3Path, provider);
    previewLog("admin_mp3_source_download_ok", {
      beat_id: beatId,
      source_mp3_downloaded: true,
      source_mp3_bytes: mp3Buffer.byteLength,
      storage_provider: provider,
    });
    return await generatePreviewFromMp3Buffer(supabase, beatId, mp3Buffer);
  } catch (error) {
    previewLogError("admin_regenerate_preview_failed", error, {
      beat_id: beatId,
      mp3_path: mp3Path,
      storage_provider: provider,
    });
    return {
      previewPath: null,
      previewWarning: PREVIEW_SKIPPED_MESSAGE,
      previewGenerated: false,
    };
  }
}

function buildPreviewAdminFeedback(
  previewPath: string | null,
  previewWarning: string | null,
  previewGenerated: boolean,
  previewAttempted: boolean,
  nextStatus: BeatStatus,
): {
  previewMessage: string | null;
  noPreviewNotice: string | null;
} {
  let previewMessage: string | null = null;

  if (previewGenerated && previewPath) {
    previewMessage = PREVIEW_GENERATED_MESSAGE;
  } else if (previewAttempted && previewWarning) {
    previewMessage = previewWarning;
  }

  const noPreviewNotice =
    nextStatus === "published" && !previewPath
      ? NO_PREVIEW_PLAYER_MESSAGE
      : null;

  return { previewMessage, noPreviewNotice };
}

export async function createBeatShell(formData: FormData) {
  const { supabase, user } = await requireAdmin();

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

  if (!title) return { error: "Le titre est requis." };
  if (!bpm || bpm < 1 || bpm > 300) return { error: "BPM invalide." };
  if (!musicalKey || !genre || !mood)
    return { error: "Tonalité, genre et mood sont requis." };
  if (genreSelect === "Autre" && !genreCustom)
    return { error: "Précisez le genre personnalisé." };
  if (!durationSeconds || durationSeconds < 1)
    return { error: "Durée invalide (en secondes)." };

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

  const licenses = LICENSE_TYPES.map((licenseType) => ({
    beat_id: beat.id,
    license_type: licenseType,
    price_cents: DEFAULT_LICENSE_PRICES[licenseType],
    storage_path: null,
    is_available: false,
  }));

  const { error: licensesError } = await supabase
    .from("beat_licenses")
    .insert(licenses);

  if (licensesError) {
    await supabase.from("beats").delete().eq("id", beat.id);
    return { error: licensesError.message };
  }

  return { success: true, beatId: beat.id };
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
  const uploadedCoverPath = getUploadedPath(formData, "uploadedCoverPath");
  const uploadedMp3Path = getUploadedPath(formData, "uploadedMp3Path");
  const uploadedWavPath = getUploadedPath(formData, "uploadedWavPath");
  const uploadedStemsPath = getUploadedPath(formData, "uploadedStemsPath");

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

  const isSoldExclusive = existing.status === "sold_exclusive";
  const mp3License = existing.beat_licenses?.find(
    (l: { license_type: string }) => l.license_type === "mp3",
  );
  const wavLicense = existing.beat_licenses?.find(
    (l: { license_type: string }) => l.license_type === "wav",
  );

  const willHaveCover = Boolean(
    uploadedCoverPath || coverFile || existing.cover_path,
  );
  const willHaveMp3 = Boolean(uploadedMp3Path || mp3License?.storage_path);
  const willHaveWav = Boolean(uploadedWavPath || wavLicense?.storage_path);

  if (status === "published" && !isSoldExclusive) {
    if (!willHaveMp3 || !willHaveWav) {
      return {
        error:
          "MP3 et WAV requis pour publier. Enregistrez en brouillon sinon.",
      };
    }
    if (!willHaveCover) {
      return { error: "La cover est requise pour publier." };
    }
  }

  let previewWarning: string | null = null;
  let previewGenerated = false;
  let previewAttempted = false;

  try {
    let coverPath = existing.cover_path;
    let previewPath = existing.preview_path;

    if (uploadedCoverPath) {
      coverPath = uploadedCoverPath;
    } else if (coverFile) {
      coverPath = resolveCoverPath(beatId, coverFile.name);
      await uploadBeatFile(
        supabase,
        STORAGE_BUCKETS.covers,
        coverPath,
        coverFile,
      );
    }

    if (uploadedWavPath) {
      await supabase
        .from("beat_licenses")
        .update(paidLicensePatch(uploadedWavPath, isSoldExclusive))
        .eq("beat_id", beatId)
        .eq("license_type", "wav");
    }

    if (uploadedStemsPath) {
      await syncStemsLicensePaths(
        supabase,
        beatId,
        uploadedStemsPath,
        isSoldExclusive,
      );
    }

    if (uploadedMp3Path) {
      previewAttempted = true;
      const mp3Result = await applyMp3Upload(
        supabase,
        beatId,
        uploadedMp3Path,
        isSoldExclusive,
      );
      if (mp3Result.previewPath) {
        previewPath = mp3Result.previewPath;
      }
      previewWarning = mp3Result.previewWarning;
      previewGenerated = mp3Result.previewGenerated;
    } else if (formData.get("regeneratePreview") === "true") {
      const mp3Path = mp3License?.storage_path;

      if (mp3Path) {
        previewAttempted = true;
        const provider = normalizeStorageProvider(
          mp3License?.storage_provider,
        );
        const regenResult = await tryRegeneratePreviewFromStoredMp3(
          supabase,
          beatId,
          mp3Path,
          provider,
        );
        if (regenResult.previewPath) {
          previewPath = regenResult.previewPath;
        }
        previewWarning = regenResult.previewWarning;
        previewGenerated = regenResult.previewGenerated;
      }
    }

    const nextStatus = isSoldExclusive
      ? "sold_exclusive"
      : status === "published"
        ? "published"
        : "draft";

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
        status: nextStatus,
        is_featured: isSoldExclusive ? false : isFeatured,
        cover_path: coverPath,
        preview_path: previewPath,
      })
      .eq("id", beatId);

    if (error) throw new Error(error.message);

    if (!isSoldExclusive) {
      await refreshBeatLicenseAvailability(supabase, beatId);
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/beats");
    revalidatePath(`/beats/${existing.slug}`);

    let successMessage: string | null = null;
    if (
      uploadedStemsPath &&
      !uploadedMp3Path &&
      !uploadedWavPath &&
      !uploadedCoverPath &&
      !coverFile
    ) {
      successMessage = "Stems mis à jour.";
    } else if (
      uploadedWavPath &&
      !uploadedMp3Path &&
      !uploadedStemsPath &&
      !uploadedCoverPath &&
      !coverFile
    ) {
      successMessage = "WAV mis à jour.";
    }

    const { previewMessage, noPreviewNotice } = buildPreviewAdminFeedback(
      previewPath,
      previewWarning,
      previewGenerated,
      previewAttempted,
      nextStatus,
    );

    return {
      success: true,
      previewWarning,
      previewMessage,
      noPreviewNotice,
      successMessage,
    };
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

    const provider = normalizeStorageProvider(mp3License?.storage_provider);
    const regenResult = await tryRegeneratePreviewFromStoredMp3(
      supabase,
      beatId,
      mp3Path,
      provider,
    );

    if (!regenResult.previewPath) {
      return {
        error: regenResult.previewWarning ?? PREVIEW_SKIPPED_MESSAGE,
      };
    }

    const previewPath = regenResult.previewPath;

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
    return { success: true, previewMessage: PREVIEW_GENERATED_MESSAGE };
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
