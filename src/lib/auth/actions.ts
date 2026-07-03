"use server";

import { redirect } from "next/navigation";
import { getAppUrl } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

function getRedirectPath(formData: FormData, fallback = "/account"): string {
  const next = formData.get("next");
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return fallback;
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  redirect(getRedirectPath(formData));
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const origin = getAppUrl();
  const next = getRedirectPath(formData);

  if (!email) {
    return { error: "Email requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { error: "Impossible d'envoyer le lien. Réessayez." };
  }

  return { success: "Lien de connexion envoyé. Vérifiez votre boîte mail." };
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const origin = getAppUrl();

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/account");
  }

  return {
    success:
      "Compte créé. Vérifiez votre email pour confirmer votre inscription.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
