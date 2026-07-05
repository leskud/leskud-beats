import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  buildPurgePlan,
  purgeTestBeatBySlug,
} from "../src/lib/admin/purge-test-beat";

function loadEnvFile() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq);
      const value = trimmed.slice(eq + 1);
      process.env[key] ??= value;
    }
  } catch {
    console.warn("[purge:test-beat] .env.local introuvable — variables système uniquement.");
  }
}

function parseArgs(argv: string[]) {
  const slugIndex = argv.indexOf("--slug");
  const slug = slugIndex >= 0 ? argv[slugIndex + 1] : undefined;
  return {
    slug,
    apply: argv.includes("--apply"),
  };
}

function printPlan(plan: Awaited<ReturnType<typeof buildPurgePlan>>) {
  if ("error" in plan) {
    console.error(`[purge:test-beat] ${plan.error}`);
    process.exit(1);
  }

  console.log(`\nBeat : ${plan.beat.title} (${plan.beat.slug})`);
  console.log(`Statut : ${plan.beat.status}`);
  console.log(`ID : ${plan.beat.id}`);

  console.log(`\nOrder items (${plan.orderItems.length}) :`);
  if (plan.orderItems.length === 0) {
    console.log("  (aucun)");
  } else {
    for (const item of plan.orderItems) {
      console.log(
        `  - ${item.id} | order ${item.order_id} | ${item.license_type} | ${item.price_cents} ct`,
      );
    }
  }

  console.log(`\nCommandes à supprimer si vides (${plan.emptyOrders.length}) :`);
  if (plan.emptyOrders.length === 0) {
    console.log("  (aucune)");
  } else {
    for (const order of plan.emptyOrders) {
      console.log(`  - ${order.id} | ${order.email} | ${order.status}`);
    }
  }

  console.log(`\nTéléchargements gratuits (lead_downloads) : ${plan.leadDownloadCount}`);
  console.log(`Lignes panier (cart_items) : ${plan.cartItemCount}`);

  console.log(`\nLicences (${plan.licenses.length}) :`);
  for (const license of plan.licenses) {
    console.log(
      `  - ${license.license_type} | ${license.storage_provider} | ${license.storage_path ?? "(aucun)"}`,
    );
  }

  console.log(`\nFichiers stockage (${plan.storageTargets.length}) :`);
  if (plan.storageTargets.length === 0) {
    console.log("  (aucun)");
  } else {
    for (const target of plan.storageTargets) {
      console.log(`  - ${target.provider} | ${target.bucket} | ${target.path}`);
    }
  }
}

async function main() {
  loadEnvFile();

  const { slug, apply } = parseArgs(process.argv.slice(2));
  if (!slug) {
    console.error("Usage : npm run purge:test-beat -- --slug <slug> [--apply]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!apply) {
    console.log(`[purge:test-beat] DRY-RUN — aucune suppression (ajoutez --apply pour exécuter)`);
    const plan = await buildPurgePlan(supabase, slug);
    printPlan(plan);
    return;
  }

  console.log(`[purge:test-beat] APPLY — purge définitive de « ${slug} »`);
  const plan = await buildPurgePlan(supabase, slug);
  printPlan(plan);

  if ("error" in plan) {
    process.exit(1);
  }

  const result = await purgeTestBeatBySlug(supabase, slug, {
    apply: true,
    slugConfirmation: plan.beat.slug,
  });

  if ("error" in result) {
    console.error(`[purge:test-beat] ${result.error}`);
    process.exit(1);
  }

  console.log("\n[purge:test-beat] Purge terminée.");
  if (result.warnings.length > 0) {
    console.log("Avertissements fichiers :");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(
    "[purge:test-beat]",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
