import { createServiceClient } from "@/lib/supabase/service";
import { buildFreeDownloadUrl } from "@/lib/leads/download-token";
import { sendFreeDownloadEmail } from "@/lib/email/send-free-download";
import {
  freeDownloadSchema,
  normalizeEmail,
  type FreeDownloadInput,
} from "@/lib/leads/validation";

type ProcessFreeDownloadParams = FreeDownloadInput & {
  userAgent: string | null;
};

type ProcessFreeDownloadResult =
  | {
      success: true;
      beatTitle: string;
      emailSent: true;
    }
  | { success: false; error: string };

export async function processFreeDownload(
  params: ProcessFreeDownloadParams,
): Promise<ProcessFreeDownloadResult> {
  const parsed = freeDownloadSchema.safeParse(params);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Données invalides.";
    return { success: false, error: message };
  }

  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const name = data.name?.trim() || null;
  const supabase = createServiceClient();

  const { data: beat, error: beatError } = await supabase
    .from("beats")
    .select("id, slug, title, preview_path, status")
    .eq("id", data.beatId)
    .single();

  if (beatError || !beat) {
    return { success: false, error: "Beat introuvable." };
  }

  if (beat.status !== "published") {
    return { success: false, error: "Ce beat n'est pas disponible." };
  }

  if (!beat.preview_path) {
    return { success: false, error: "Preview indisponible pour ce beat." };
  }

  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, marketing_consent")
    .eq("email", email)
    .maybeSingle();

  let leadId: string;

  if (existingLead) {
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(name ? { name } : {}),
        marketing_consent: data.marketingConsent
          ? true
          : existingLead.marketing_consent,
      })
      .eq("id", existingLead.id)
      .select("id")
      .single();

    if (updateError || !updatedLead) {
      return { success: false, error: "Impossible de mettre à jour le lead." };
    }
    leadId = updatedLead.id;
  } else {
    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        email,
        name,
        marketing_consent: data.marketingConsent,
        source: "free_download",
        last_seen_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newLead) {
      return { success: false, error: "Impossible d'enregistrer le lead." };
    }
    leadId = newLead.id;
  }

  const { error: downloadError } = await supabase.from("lead_downloads").insert({
    lead_id: leadId,
    beat_id: beat.id,
    user_agent: params.userAgent,
    referrer: data.referrer || null,
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
  });

  if (downloadError) {
    return { success: false, error: "Impossible d'enregistrer le téléchargement." };
  }

  const downloadUrl = buildFreeDownloadUrl(beat.id, email);

  const emailResult = await sendFreeDownloadEmail({
    to: email,
    name,
    beatTitle: beat.title,
    downloadUrl,
  });

  if (!emailResult.sent) {
    return {
      success: false,
      error:
        emailResult.error ??
        "Impossible d'envoyer l'email. Vérifie ton adresse et réessaye.",
    };
  }

  return {
    success: true,
    beatTitle: beat.title,
    emailSent: true,
  };
}
