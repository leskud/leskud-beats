import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { analyzeBufferCore } from "../src/lib/audio/analyze-core";
import { formatReanalysisPreview } from "../src/lib/audio/analyze-shared";

const STORAGE_BUCKETS = {
  beats: "beats",
  previews: "previews",
} as const;

type BeatRow = {
  id: string;
  title: string;
  status: string;
  bpm: number;
  musical_key: string;
  duration_seconds: number;
  preview_path: string | null;
  beat_licenses: Array<{
    license_type: string;
    storage_path: string | null;
    storage_provider: string | null;
  }>;
};

function loadEnvFile() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq);
      const value = t.slice(eq + 1);
      process.env[key] ??= value;
    }
  } catch {
    console.warn("[audio:backfill] .env.local introuvable — variables système uniquement.");
  }
}

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes("--apply"),
    onlyMissing: argv.includes("--only-missing"),
    force: argv.includes("--force"),
  };
}

function getR2Client(): { client: S3Client; bucket: string } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error("Configuration R2 incomplète (variables R2_*).");
  }

  return {
    bucket,
    client: new S3Client({
      region: process.env.R2_REGION ?? "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

async function downloadR2Buffer(key: string): Promise<Buffer> {
  const { client, bucket } = getR2Client();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!response.Body) throw new Error(`R2 introuvable: ${key}`);
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

async function downloadSupabaseBuffer(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Supabase introuvable (${bucket}/${path}): ${error?.message}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

function resolveAudioSource(beat: BeatRow) {
  const mp3 = beat.beat_licenses.find(
    (l) => l.license_type === "mp3" && l.storage_path?.trim(),
  );
  const wav = beat.beat_licenses.find(
    (l) => l.license_type === "wav" && l.storage_path?.trim(),
  );

  if (mp3?.storage_path) {
    return {
      path: mp3.storage_path,
      bucket: STORAGE_BUCKETS.beats,
      provider: mp3.storage_provider ?? "r2",
      sourceType: "mp3" as const,
    };
  }
  if (wav?.storage_path) {
    return {
      path: wav.storage_path,
      bucket: STORAGE_BUCKETS.beats,
      provider: wav.storage_provider ?? "r2",
      sourceType: "wav" as const,
    };
  }
  if (beat.preview_path?.trim()) {
    return {
      path: beat.preview_path,
      bucket: STORAGE_BUCKETS.previews,
      provider: "supabase",
      sourceType: "preview" as const,
    };
  }
  return null;
}

function isFieldMissing(
  field: "bpm" | "musicalKey" | "duration",
  beat: BeatRow,
): boolean {
  if (field === "bpm") return !beat.bpm || beat.bpm < 1;
  if (field === "duration") return !beat.duration_seconds || beat.duration_seconds < 1;
  return !beat.musical_key?.trim();
}

function buildPatch(
  beat: BeatRow,
  detected: ReturnType<typeof formatReanalysisPreview>,
  options: { onlyMissing: boolean; force: boolean },
) {
  const patch: Record<string, number | string> = {};

  if (
    detected.bpmDetected &&
    detected.bpm &&
    (options.force || options.onlyMissing ? isFieldMissing("bpm", beat) : true)
  ) {
    if (!options.onlyMissing || isFieldMissing("bpm", beat) || options.force) {
      patch.bpm = detected.bpm;
    }
  }

  if (
    detected.keyDetected &&
    detected.musicalKey &&
    (options.force || !options.onlyMissing || isFieldMissing("musicalKey", beat))
  ) {
    if (
      !options.onlyMissing ||
      isFieldMissing("musicalKey", beat) ||
      options.force
    ) {
      patch.musical_key = detected.musicalKey;
    }
  }

  if (
    detected.durationDetected &&
    detected.duration &&
    (options.force || !options.onlyMissing || isFieldMissing("duration", beat))
  ) {
    if (
      !options.onlyMissing ||
      isFieldMissing("duration", beat) ||
      options.force
    ) {
      patch.duration_seconds = detected.duration;
    }
  }

  return patch;
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: beats, error } = await supabase
    .from("beats")
    .select("id, title, status, bpm, musical_key, duration_seconds, preview_path, beat_licenses(license_type, storage_path, storage_provider)")
    .eq("status", "published");

  if (error) throw error;

  console.log(
    `[audio:backfill] ${beats?.length ?? 0} beat(s) publié(s) — mode ${args.apply ? "APPLY" : "DRY-RUN"}${args.onlyMissing ? " (only-missing)" : ""}${args.force ? " (force)" : ""}`,
  );

  let updated = 0;
  let skipped = 0;

  for (const beat of (beats ?? []) as BeatRow[]) {
    const source = resolveAudioSource(beat);
    if (!source) {
      console.log(`— ${beat.title}: aucun audio accessible, ignoré.`);
      skipped++;
      continue;
    }

    try {
      const buffer =
        source.provider === "r2"
          ? await downloadR2Buffer(source.path)
          : await downloadSupabaseBuffer(supabase, source.bucket, source.path);

      const analysis = await analyzeBufferCore(buffer, {
        mimeType: source.sourceType === "wav" ? "audio/wav" : "audio/mpeg",
      });
      const preview = formatReanalysisPreview(analysis);
      const patch = buildPatch(beat, preview, {
        onlyMissing: args.onlyMissing,
        force: args.force,
      });

      console.log(`\n• ${beat.title} [${source.sourceType}]`);
      console.log(
        `  actuel  : ${beat.bpm} BPM · ${beat.musical_key} · ${beat.duration_seconds}s`,
      );
      console.log(`  détecté : ${preview.summary}`);
      if (preview.detailLines.length) {
        console.log(`  notes   : ${preview.detailLines.join(" · ")}`);
      }
      console.log(`  sources : ${analysis.sources.join(", ") || "—"}`);

      if (Object.keys(patch).length === 0) {
        console.log("  → aucun changement proposé");
        skipped++;
        continue;
      }

      console.log(`  patch   : ${JSON.stringify(patch)}`);

      if (args.apply) {
        const { error: updateError } = await supabase
          .from("beats")
          .update(patch)
          .eq("id", beat.id);
        if (updateError) throw updateError;
        console.log("  ✓ appliqué");
        updated++;
      } else {
        console.log("  (dry-run — ajoutez --apply pour écrire)");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ erreur: ${message}`);
      skipped++;
    }
  }

  console.log(
    `\n[audio:backfill] terminé — ${updated} mis à jour, ${skipped} ignoré(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
