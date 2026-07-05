"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { purgeTestBeat } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PurgeBeatButtonProps = {
  beatId: string;
  slug: string;
  title: string;
};

export function PurgeBeatButton({ beatId, slug, title }: PurgeBeatButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const slugMatches = slugInput.trim().toLowerCase() === slug.toLowerCase();

  function close() {
    setIsOpen(false);
    setSlugInput("");
    setError(null);
    setWarnings([]);
  }

  function handlePurge() {
    if (!slugMatches) {
      setError("Le slug saisi ne correspond pas.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setWarnings([]);

      const result = await purgeTestBeat(beatId, slugInput.trim());

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.warnings?.length) {
        setWarnings(result.warnings);
      }

      router.refresh();
      close();
      alert(
        result?.warnings?.length
          ? `Beat « ${title} » purgé avec avertissements fichier (voir logs serveur).`
          : `Beat « ${title} » purgé définitivement.`,
      );
    });
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        className="text-red-500 hover:text-red-400"
      >
        Purger test
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-red-500/30 bg-red-500/5 p-4">
      <p className="text-sm font-medium text-red-300">
        Purge définitive — {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Cette action supprimera définitivement le beat, ses fichiers, ses
        licences, ses achats test et ses téléchargements. Impossible
        d&apos;annuler.
      </p>

      <label className="mt-4 block text-sm">
        Tape le slug pour confirmer :{" "}
        <span className="font-mono text-foreground">{slug}</span>
      </label>
      <Input
        value={slugInput}
        onChange={(event) => setSlugInput(event.target.value)}
        placeholder={slug}
        className="mt-2"
        autoComplete="off"
        disabled={isPending}
      />

      {error && (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={close}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={isPending || !slugMatches}
          onClick={handlePurge}
          className="bg-red-600 text-white hover:bg-red-500"
        >
          {isPending ? "Purge en cours…" : "Purger définitivement"}
        </Button>
      </div>
    </div>
  );
}
