import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { getResendConfig } from "@/lib/config/env";
import {
  BRAND_GOLD,
  RESEND_TEST_RECIPIENT,
  SITE_NAME,
  YOUTUBE_CHANNEL_URL,
} from "@/lib/constants";
import { EMAIL_ASSET_PATHS } from "@/lib/email/generate-assets";

const BADGE_CID = "leskud-badge";
const YOUTUBE_CID = "youtube-icon";

type SendFreeDownloadEmailParams = {
  to: string;
  name: string | null;
  beatTitle: string;
  downloadUrl: string;
};

type EmailAssets = {
  badgeCid: string;
  youtubeCid: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentId: string;
  }>;
};

export function mapResendError(message: string): string {
  const lower = message.toLowerCase();
  const { testRecipient } = getResendConfig();
  const recipient = testRecipient ?? RESEND_TEST_RECIPIENT;

  if (
    lower.includes("only send testing emails") ||
    lower.includes("verify a domain")
  ) {
    return `En mode test Resend, seule l'adresse ${recipient} peut recevoir des emails. Pour envoyer à n'importe qui, vérifie un domaine sur resend.com/domains.`;
  }

  return message;
}

function readAssetAttachment(
  filePath: string,
  filename: string,
  contentId: string,
): EmailAssets["attachments"][number] | null {
  try {
    return {
      filename,
      content: fs.readFileSync(filePath),
      contentId,
    };
  } catch {
    return null;
  }
}

function getEmailAssets(): EmailAssets {
  const attachments: EmailAssets["attachments"] = [];
  let badgeCid = "";
  let youtubeCid = "";

  const badge = readAssetAttachment(
    EMAIL_ASSET_PATHS.badge,
    "leskud-badge.png",
    BADGE_CID,
  );
  if (badge) {
    attachments.push(badge);
    badgeCid = BADGE_CID;
  }

  const youtube = readAssetAttachment(
    EMAIL_ASSET_PATHS.youtube,
    "youtube.png",
    YOUTUBE_CID,
  );
  if (youtube) {
    attachments.push(youtube);
    youtubeCid = YOUTUBE_CID;
  }

  return { badgeCid, youtubeCid, attachments };
}

function buildEmailBadge(badgeCid: string): string {
  if (!badgeCid) {
    return `
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;letter-spacing:0.14em;color:${BRAND_GOLD};">
  ${SITE_NAME}
</p>`;
  }

  return `
<img
  src="cid:${badgeCid}"
  alt="${SITE_NAME}"
  width="120"
  height="120"
  style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;"
/>`;
}

function buildYoutubeIconLink(youtubeCid: string): string {
  if (!youtubeCid) {
    return `
<a href="${YOUTUBE_CHANNEL_URL}" aria-label="YouTube LeSkud" style="display:inline-block;width:40px;height:28px;background:#ff0000;border-radius:6px;text-decoration:none;color:#ffffff;font-size:12px;line-height:28px;text-align:center;font-family:Arial,sans-serif;">
  &#9654;
</a>`;
  }

  return `
<a href="${YOUTUBE_CHANNEL_URL}" aria-label="YouTube LeSkud" style="text-decoration:none;display:inline-block;line-height:0;">
  <img
    src="cid:${youtubeCid}"
    alt="YouTube"
    width="40"
    height="40"
    style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;"
  />
</a>`;
}

function buildFreeDownloadEmailHtml(
  params: SendFreeDownloadEmailParams,
  assets: EmailAssets,
): string {
  const greeting = params.name?.trim()
    ? `Salut ${params.name.trim()},`
    : "Salut,";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <title>Ton MP3 tagué — ${params.beatTitle}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#0a0a0a;border:1px solid #1f1f1f;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 24px;text-align:center;background:#0a0a0a;">
              ${buildEmailBadge(assets.badgeCid)}
              <table role="presentation" width="48" cellspacing="0" cellpadding="0" style="margin:20px auto 0;">
                <tr>
                  <td style="height:1px;background:${BRAND_GOLD};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#e4e4e7;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#a1a1aa;">
                Tu peux télécharger ton beat avec le lien ci-dessous.
              </p>
              <p style="margin:0 0 8px;font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#71717a;">Preview taguée</p>
              <p style="margin:0 0 32px;font-size:28px;font-weight:700;line-height:1.15;color:#ffffff;letter-spacing:-0.02em;">${params.beatTitle}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="min-width:240px;">
                      <tr>
                        <td align="center" style="border-radius:999px;background:${BRAND_GOLD};">
                          <a href="${params.downloadUrl}" style="display:inline-block;padding:15px 36px;font-size:14px;font-weight:700;color:#0a0a0a;text-decoration:none;letter-spacing:0.04em;text-transform:uppercase;">
                            Télécharger le MP3
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-size:11px;line-height:1.6;color:#52525b;text-align:center;">
                Lien direct :
                <a href="${params.downloadUrl}" style="color:#737373;text-decoration:underline;word-break:break-all;">${params.downloadUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 36px;border-top:1px solid #171717;text-align:center;background:#080808;">
              ${buildYoutubeIconLink(assets.youtubeCid)}
              <p style="margin:18px 0 0;font-size:10px;letter-spacing:0.08em;color:#3f3f46;">© ${SITE_NAME}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendFreeDownloadEmail(
  params: SendFreeDownloadEmailParams,
): Promise<{ sent: boolean; error?: string }> {
  const { apiKey, from } = getResendConfig();

  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY absente — email preview non envoyé.");
    return { sent: false, error: "RESEND_API_KEY non configurée." };
  }

  const assets = getEmailAssets();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Ton MP3 tagué — ${params.beatTitle}`,
    html: buildFreeDownloadEmailHtml(params, assets),
    attachments: assets.attachments.length > 0 ? assets.attachments : undefined,
  });

  if (error) {
    console.error("[resend] free-download email failed:", error.message);
    return { sent: false, error: mapResendError(error.message) };
  }

  return { sent: true };
}
