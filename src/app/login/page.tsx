import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Connexion",
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold">Connexion</h1>
        <p className="mt-2 text-muted">
          Accédez à vos achats et téléchargements.
        </p>
      </div>

      <LoginForm
        next={params.next ?? "/account"}
        authError={params.error === "auth"}
      />

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="hover:text-foreground">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
