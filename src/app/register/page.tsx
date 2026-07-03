import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = {
  title: "Créer un compte",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold">Créer un compte</h1>
        <p className="mt-2 text-muted">
          Recommandé pour retrouver vos achats à tout moment.
        </p>
      </div>

      <RegisterForm />

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
