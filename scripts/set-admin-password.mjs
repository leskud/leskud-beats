import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envRaw = fs.readFileSync(".env.local", "utf8");

const env = Object.fromEntries(
  envRaw
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index).trim(),
        line.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const userId = process.argv[2];
const password = process.argv[3];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase URL ou SERVICE_ROLE_KEY manquante dans .env.local");
}

if (!userId || !password) {
  throw new Error("Usage: node scripts/set-admin-password.mjs USER_ID NOUVEAU_MDP");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  password,
  email_confirm: true,
});

if (error) {
  throw error;
}

console.log("Mot de passe mis à jour pour :", data.user.email);
