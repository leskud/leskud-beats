"use client";

import Link from "next/link";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/legal/versions";

type LicenseAcceptanceCheckboxProps = {
  acceptedTerms: boolean;
  acceptedImmediateAccess: boolean;
  onAcceptedTermsChange: (checked: boolean) => void;
  onAcceptedImmediateAccessChange: (checked: boolean) => void;
};

export function LicenseAcceptanceCheckbox({
  acceptedTerms,
  acceptedImmediateAccess,
  onAcceptedTermsChange,
  onAcceptedImmediateAccessChange,
}: LicenseAcceptanceCheckboxProps) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="license-acceptance-terms"
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/40 p-4 text-left text-sm"
      >
        <input
          id="license-acceptance-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => onAcceptedTermsChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
        />
        <span className="text-muted">
          J&apos;ai lu et j&apos;accepte les{" "}
          <Link
            href="/legal/cgv"
            target="_blank"
            className="text-gold underline-offset-2 hover:underline"
          >
            CGV
          </Link>{" "}
          et la{" "}
          <Link
            href="/legal/licences"
            target="_blank"
            className="text-gold underline-offset-2 hover:underline"
          >
            licence associée
          </Link>{" "}
          à mon achat.
        </span>
      </label>

      <div className="rounded-lg border border-border bg-background/40 p-4 text-left text-sm">
        <label
          htmlFor="license-acceptance-access"
          className="flex cursor-pointer items-start gap-3"
        >
          <input
            id="license-acceptance-access"
            type="checkbox"
            checked={acceptedImmediateAccess}
            onChange={(event) =>
              onAcceptedImmediateAccessChange(event.target.checked)
            }
            className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
          />
          <span className="font-medium text-foreground">
            Recevoir mes fichiers immédiatement après paiement.
          </span>
        </label>
        <p className="mt-2 pl-7 text-xs text-muted">
          En lançant le téléchargement, l&apos;achat devient définitif pour ces
          fichiers numériques.
        </p>
      </div>
    </div>
  );
}

export { LICENSE_VERSION, TERMS_VERSION };
