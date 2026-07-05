import type { SupabaseClient } from "@supabase/supabase-js";
import { S3Client } from "@aws-sdk/client-s3";
import { canPurgeBeat } from "@/lib/admin/purge-eligibility";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { deleteR2ObjectKey } from "@/lib/storage/r2-commands";
import type { BeatStatus } from "@/types";

export type PurgeStorageTarget = {
  provider: "r2" | "supabase";
  bucket: string;
  path: string;
};

export type PurgeOrderItemRow = {
  id: string;
  order_id: string;
  license_type: string;
  price_cents: number;
};

export type PurgeOrderRow = {
  id: string;
  email: string;
  status: string;
};

export type PurgeLicenseRow = {
  id: string;
  license_type: string;
  storage_path: string | null;
  storage_provider: string;
};

export type PurgePlan = {
  beat: {
    id: string;
    slug: string;
    title: string;
    status: BeatStatus;
  };
  orderItems: PurgeOrderItemRow[];
  emptyOrders: PurgeOrderRow[];
  leadDownloadCount: number;
  cartItemCount: number;
  licenses: PurgeLicenseRow[];
  storageTargets: PurgeStorageTarget[];
};

export type PurgeResult = {
  plan: PurgePlan;
  applied: boolean;
  warnings: string[];
};

type BeatRow = {
  id: string;
  slug: string;
  title: string;
  status: BeatStatus;
  cover_path: string | null;
  preview_path: string | null;
  beat_licenses: PurgeLicenseRow[];
};

function storageTargetKey(target: PurgeStorageTarget): string {
  return `${target.provider}:${target.bucket}:${target.path}`;
}

function addStorageTarget(
  targets: Map<string, PurgeStorageTarget>,
  target: PurgeStorageTarget,
) {
  targets.set(storageTargetKey(target), target);
}

async function listSupabaseFolderPaths(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const { data: files, error } = await supabase.storage.from(bucket).list(folder);
  if (error || !files?.length) return [];
  return files.map((file) => `${folder}/${file.name}`);
}

async function collectStorageTargets(
  supabase: SupabaseClient,
  beat: BeatRow,
): Promise<PurgeStorageTarget[]> {
  const targets = new Map<string, PurgeStorageTarget>();

  if (beat.cover_path) {
    addStorageTarget(targets, {
      provider: "supabase",
      bucket: STORAGE_BUCKETS.covers,
      path: beat.cover_path,
    });
  }

  if (beat.preview_path) {
    addStorageTarget(targets, {
      provider: "supabase",
      bucket: STORAGE_BUCKETS.previews,
      path: beat.preview_path,
    });
  }

  for (const bucket of [
    STORAGE_BUCKETS.covers,
    STORAGE_BUCKETS.previews,
    STORAGE_BUCKETS.beats,
  ]) {
    const folderPaths = await listSupabaseFolderPaths(supabase, bucket, beat.id);
    for (const path of folderPaths) {
      addStorageTarget(targets, {
        provider: "supabase",
        bucket,
        path,
      });
    }
  }

  for (const license of beat.beat_licenses) {
    const path = license.storage_path?.trim();
    if (!path) continue;

    if (license.storage_provider === "r2") {
      addStorageTarget(targets, {
        provider: "r2",
        bucket: "r2",
        path,
      });
      continue;
    }

    addStorageTarget(targets, {
      provider: "supabase",
      bucket: STORAGE_BUCKETS.beats,
      path,
    });
  }

  return [...targets.values()];
}

export async function buildPurgePlan(
  supabase: SupabaseClient,
  slug: string,
): Promise<PurgePlan | { error: string }> {
  const normalizedSlug = slug.trim().toLowerCase();

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select(
      `
      id,
      slug,
      title,
      status,
      cover_path,
      preview_path,
      beat_licenses (
        id,
        license_type,
        storage_path,
        storage_provider
      )
    `,
    )
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (beatError) {
    return { error: beatError.message };
  }

  if (!beat) {
    return { error: `Beat introuvable pour le slug « ${normalizedSlug} ».` };
  }

  const beatRow = beat as BeatRow;

  if (!canPurgeBeat(beatRow)) {
    return {
      error:
        "Ce beat n'est pas éligible à la purge (prod publiée non test). Utilisez la suppression standard.",
    };
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("id, order_id, license_type, price_cents")
    .eq("beat_id", beatRow.id);

  if (orderItemsError) {
    return { error: orderItemsError.message };
  }

  const orderIds = [
    ...new Set((orderItems ?? []).map((item) => item.order_id)),
  ];

  const emptyOrders: PurgeOrderRow[] = [];

  for (const orderId of orderIds) {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, email, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) continue;

    const { count: totalItems } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("order_id", orderId);

    const { count: beatItems } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("beat_id", beatRow.id);

    if ((totalItems ?? 0) > 0 && (beatItems ?? 0) === totalItems) {
      emptyOrders.push(order);
    }
  }

  const { count: leadDownloadCount } = await supabase
    .from("lead_downloads")
    .select("*", { count: "exact", head: true })
    .eq("beat_id", beatRow.id);

  const licenseIds = beatRow.beat_licenses.map((license) => license.id);
  let cartItemCount = 0;

  if (licenseIds.length > 0) {
    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .in("beat_license_id", licenseIds);
    cartItemCount = count ?? 0;
  }

  const storageTargets = await collectStorageTargets(supabase, beatRow);

  return {
    beat: {
      id: beatRow.id,
      slug: beatRow.slug,
      title: beatRow.title,
      status: beatRow.status,
    },
    orderItems: orderItems ?? [],
    emptyOrders,
    leadDownloadCount: leadDownloadCount ?? 0,
    cartItemCount,
    licenses: beatRow.beat_licenses,
    storageTargets,
  };
}

type R2Env = {
  client: S3Client;
  bucket: string;
};

function getR2EnvFromProcess(): R2Env | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const endpoint = process.env.R2_ENDPOINT;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    return null;
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

async function deleteStorageTargets(
  supabase: SupabaseClient,
  targets: PurgeStorageTarget[],
  warnings: string[],
) {
  const r2Env = getR2EnvFromProcess();

  for (const target of targets) {
    try {
      if (target.provider === "r2") {
        if (!r2Env) {
          warnings.push(`R2 non configuré — fichier non supprimé : ${target.path}`);
          continue;
        }
        await deleteR2ObjectKey(r2Env.client, r2Env.bucket, target.path);
        continue;
      }

      const { error } = await supabase.storage
        .from(target.bucket)
        .remove([target.path]);

      if (error) {
        warnings.push(
          `Supabase ${target.bucket}/${target.path} : ${error.message}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur de suppression fichier.";
      warnings.push(`${target.provider} ${target.path} : ${message}`);
      console.error("[purge-beat] storage delete failed:", target, error);
    }
  }
}

export async function purgeTestBeatBySlug(
  supabase: SupabaseClient,
  slug: string,
  options: { apply: boolean; slugConfirmation?: string },
): Promise<PurgeResult | { error: string }> {
  const planResult = await buildPurgePlan(supabase, slug);
  if ("error" in planResult) return planResult;

  if (options.apply) {
    const confirmation = options.slugConfirmation?.trim().toLowerCase();
    if (!confirmation || confirmation !== planResult.beat.slug.toLowerCase()) {
      return {
        error: "Confirmation invalide — tapez exactement le slug du beat.",
      };
    }
  }

  if (!options.apply) {
    return { plan: planResult, applied: false, warnings: [] };
  }

  const warnings: string[] = [];
  const beatId = planResult.beat.id;

  const { error: orderItemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("beat_id", beatId);

  if (orderItemsError) {
    return { error: `Suppression order_items échouée : ${orderItemsError.message}` };
  }

  for (const order of planResult.emptyOrders) {
    const { count } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("order_id", order.id);

    if ((count ?? 0) > 0) continue;

    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) {
      warnings.push(`Commande ${order.id} non supprimée : ${error.message}`);
      console.error("[purge-beat] order delete failed:", order.id, error);
    }
  }

  const { error: leadDownloadsError } = await supabase
    .from("lead_downloads")
    .delete()
    .eq("beat_id", beatId);

  if (leadDownloadsError) {
    return {
      error: `Suppression lead_downloads échouée : ${leadDownloadsError.message}`,
    };
  }

  await deleteStorageTargets(supabase, planResult.storageTargets, warnings);

  const { error: beatDeleteError } = await supabase
    .from("beats")
    .delete()
    .eq("id", beatId);

  if (beatDeleteError) {
    return { error: `Suppression beat échouée : ${beatDeleteError.message}` };
  }

  return { plan: planResult, applied: true, warnings };
}
