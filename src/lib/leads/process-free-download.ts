import { createServiceClient } from "@/lib/supabase/service";
import { buildFreeDownloadUrl, createFreeDownloadToken } from "@/lib/leads/download-token";
import { buildFreeDownloadFileQuery } from "@/lib/leads/download-token-query";
import { sendFreeDownloadEmail } from "@/lib/email/send-free-download";
import {
  FREE_PREVIEW_DOWNLOAD_SOURCE,
  FREE_PREVIEW_NEWSLETTER_CONSENT_TEXT,
} from "@/lib/leads/consent";
import {
  freeDownloadSchema,
  normalizeEmail,
  type FreeDownloadInput,
} from "@/lib/leads/validation";
import { buildPreviewDownloadFilename } from "@/lib/orders/download-filename";

type ProcessFreeDownloadParams = FreeDownloadInput & {
  userAgent: string | null;
  clientIp: string | null;
};

type ProcessFreeDownloadResult =
  | {
      success: true;
      beatTitle: string;
      emailSent: boolean;
      emailWarning?: string;
      downloadPath: string;
      previewFilename: string;
    }
  | { success: false; error: string };

const EMAIL_WARNING =
  "Inscription enregistrée. Le téléchargement est disponible, mais l'email n'a pas pu être envoyé.";

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
  const now = new Date().toISOString();
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

  const leadPayload = {
    last_seen_at: now,
    marketing_consent: true,
    accepted_newsletter_at: now,
    consent_text: FREE_PREVIEW_NEWSLETTER_CONSENT_TEXT,
    source: FREE_PREVIEW_DOWNLOAD_SOURCE,
    ...(name ? { name } : {}),
  };

  const { data: existingLead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let leadId: string;

  if (existingLead) {
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update(leadPayload)
      .eq("id", existingLead.id)
      .select("id")
      .single();

    if (updateError || !updatedLead) {
      console.error("[free-download] lead update failed:", updateError?.message);
      return { success: false, error: "Impossible de mettre à jour le lead." };
    }
    leadId = updatedLead.id;
  } else {
    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        email,
        ...leadPayload,
      })
      .select("id")
      .single();

    if (insertError || !newLead) {
      console.error("[free-download] lead insert failed:", insertError?.message);
      return { success: false, error: "Impossible d'enregistrer le lead." };
    }
    leadId = newLead.id;
  }

  const { error: downloadError } = await supabase.from("lead_downloads").insert({
    lead_id: leadId,
    beat_id: beat.id,
    user_agent: params.userAgent,
    client_ip: params.clientIp,
    referrer: data.referrer || null,
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
  });

  if (downloadError) {
    console.error(
      "[free-download] lead_download insert failed:",
      downloadError.message,
    );
    return { success: false, error: "Impossible d'enregistrer le téléchargement." };
  }

  const { token, exp } = createFreeDownloadToken(beat.id, email);
  const downloadPath = buildFreeDownloadFileQuery(beat.id, email, token, exp);
  const previewFilename = buildPreviewDownloadFilename(beat.title);
  const downloadUrl = buildFreeDownloadUrl(beat.id, email);

  let emailSent = false;
  let emailWarning: string | undefined;

  try {
    const emailResult = await sendFreeDownloadEmail({
      to: email,
      name,
      beatTitle: beat.title,
      downloadUrl,
    });

    if (emailResult.sent) {
      emailSent = true;
    } else {
      console.error(
        "[free-download] Resend email failed:",
        emailResult.error ?? "unknown error",
      );
      emailWarning = EMAIL_WARNING;
    }
  } catch (error) {
    console.error(
      "[free-download] Resend email threw:",
      error instanceof Error ? error.message : error,
    );
    emailWarning = EMAIL_WARNING;
  }

  return {
    success: true,
    beatTitle: beat.title,
    emailSent,
    emailWarning,
    downloadPath,
    previewFilename,
  };
}
