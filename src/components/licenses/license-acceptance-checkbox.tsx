"use client";

import Link from "next/link";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/legal/versions";

type LicenseAcceptanceCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

export function LicenseAcceptanceCheckbox({
  checked,
  onChange,
  id = "license-acceptance",
}: LicenseAcceptanceCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/40 p-4 text-left text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
        required
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
        et les{" "}
        <Link
          href="/legal/licences"
          target="_blank"
          className="text-gold underline-offset-2 hover:underline"
        >
          conditions de licence
        </Link>{" "}
        applicables à cette commande.
      </span>
    </label>
  );
}

export { LICENSE_VERSION, TERMS_VERSION };
