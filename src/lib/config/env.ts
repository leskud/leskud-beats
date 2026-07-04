import { z } from "zod";
import "server-only";

const isProduction = process.env.NODE_ENV === "production";

const urlSchema = z.string().url();

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    NEXT_PUBLIC_APP_URL: urlSchema.optional(),
    NEXT_PUBLIC_SUPABASE_URL: urlSchema,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),
    RESEND_TEST_RECIPIENT: z.string().email().optional(),
    DOWNLOAD_TOKEN_SECRET: z.string().min(1).optional(),
    FREE_DOWNLOAD_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    ADMIN_EMAIL: z.string().email().optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_ENDPOINT: z.string().url().optional(),
    R2_REGION: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (isProduction) {
      if (!env.NEXT_PUBLIC_APP_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_APP_URL"],
          message: "NEXT_PUBLIC_APP_URL est obligatoire en production.",
        });
      } else if (
        env.NEXT_PUBLIC_APP_URL.includes("localhost") ||
        env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_APP_URL"],
          message:
            "NEXT_PUBLIC_APP_URL ne doit pas pointer vers localhost en production.",
        });
      } else if (
        /^https?:\/\/leskud-beats-[a-z0-9-]+\.vercel\.app/i.test(
          env.NEXT_PUBLIC_APP_URL,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_APP_URL"],
          message:
            "NEXT_PUBLIC_APP_URL ne doit pas être une URL preview Vercel.",
        });
      }

      if (!env.DOWNLOAD_TOKEN_SECRET || env.DOWNLOAD_TOKEN_SECRET.length < 32) {
        ctx.addIssue({
          code: "custom",
          path: ["DOWNLOAD_TOKEN_SECRET"],
          message:
            "DOWNLOAD_TOKEN_SECRET est obligatoire en production (32 caractères minimum).",
        });
      }

      if (!env.RESEND_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY est obligatoire en production.",
        });
      }

      const r2Keys = [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "R2_ENDPOINT",
      ] as const;

      for (const key of r2Keys) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} est obligatoire en production.`,
          });
        }
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

function readRawEnv(): ServerEnv {
  return serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_TEST_RECIPIENT: process.env.RESEND_TEST_RECIPIENT,
    DOWNLOAD_TOKEN_SECRET: process.env.DOWNLOAD_TOKEN_SECRET,
    FREE_DOWNLOAD_TOKEN_TTL_SECONDS:
      process.env.FREE_DOWNLOAD_TOKEN_TTL_SECONDS,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_REGION: process.env.R2_REGION,
  });
}

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = readRawEnv();
  }
  return cachedEnv;
}

export { getAppUrl, DEV_APP_URL } from "@/lib/config/app-url";

const DEV_DOWNLOAD_SECRET = "dev-download-token-secret-change-me";

export function getDownloadTokenSecret(): string {
  const env = getServerEnv();
  const secret = env.DOWNLOAD_TOKEN_SECRET;

  if (secret) return secret;

  if (isProduction) {
    throw new Error("DOWNLOAD_TOKEN_SECRET est obligatoire en production.");
  }

  return DEV_DOWNLOAD_SECRET;
}

export function getFreeDownloadTokenTtlSeconds(): number {
  return getServerEnv().FREE_DOWNLOAD_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7;
}

export function getResendConfig(): {
  apiKey: string | undefined;
  from: string;
  testRecipient: string | undefined;
} {
  const env = getServerEnv();
  return {
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL ?? "LeSkud Beats <onboarding@resend.dev>",
    testRecipient: env.RESEND_TEST_RECIPIENT,
  };
}

export function getSupabasePublicConfig(): {
  url: string;
  anonKey: string;
} {
  const env = getServerEnv();
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseServiceRoleKey(): string {
  return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
}

export function getStripeConfig(): {
  secretKey: string | undefined;
  webhookSecret: string | undefined;
  publishableKey: string | undefined;
} {
  const env = getServerEnv();
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
}

export function isStripeConfigured(): boolean {
  const { secretKey, webhookSecret } = getStripeConfig();
  return Boolean(secretKey && webhookSecret);
}

export function getR2Config(): {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  region: string;
} {
  const env = getServerEnv();
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.R2_BUCKET_NAME;
  const endpoint = env.R2_ENDPOINT;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error(
      "Configuration R2 incomplète — vérifiez les variables R2_*.",
    );
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    region: env.R2_REGION ?? "auto",
  };
}

export function isR2Configured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      env.R2_ENDPOINT,
  );
}
