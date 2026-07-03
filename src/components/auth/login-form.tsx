"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  signInWithMagicLink,
  signInWithPassword,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  next?: string;
  authError?: boolean;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Chargement..." : label}
    </Button>
  );
}

export function LoginForm({ next = "/account", authError }: LoginFormProps) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(authError ? { type: "error", text: "Connexion échouée. Réessayez." } : null);

  async function handlePassword(formData: FormData) {
    setMessage(null);
    const result = await signInWithPassword(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    }
  }

  async function handleMagicLink(formData: FormData) {
    setMessage(null);
    const result = await signInWithMagicLink(formData);
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: result.success });
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex rounded-lg border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-md py-2 text-sm transition-colors ${
            mode === "password"
              ? "bg-background text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`flex-1 rounded-md py-2 text-sm transition-colors ${
            mode === "magic"
              ? "bg-background text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Magic link
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-gold/30 bg-gold/10 text-gold"
          }`}
        >
          {message.text}
        </div>
      )}

      {mode === "password" ? (
        <form action={handlePassword} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-muted">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm text-muted"
            >
              Mot de passe
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
          <SubmitButton label="Se connecter" />
        </form>
      ) : (
        <form action={handleMagicLink} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <p className="text-sm text-muted">
            Recevez un lien de connexion par email, sans mot de passe.
          </p>
          <div>
            <label
              htmlFor="magic-email"
              className="mb-1.5 block text-sm text-muted"
            >
              Email
            </label>
            <Input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="vous@exemple.com"
            />
          </div>
          <SubmitButton label="Envoyer le lien" />
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-gold hover:text-gold-muted">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
