import Link from "next/link";
import { cn } from "@/lib/utils";

type LeskudLogoProps = {
  href?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  shimmer?: boolean;
};

const sizeClasses = {
  sm: "text-base tracking-[0.18em]",
  md: "text-[1.65rem] tracking-[0.14em]",
  lg: "text-4xl tracking-[0.12em] sm:text-5xl",
};

export function LeskudLogo({
  href = "/",
  className,
  size = "md",
  shimmer = false,
}: LeskudLogoProps) {
  const wordmark = (
    <span
      className={cn(
        "relative inline-flex font-display font-extrabold leading-none",
        sizeClasses[size],
        className,
      )}
    >
      <span className="leskud-wordmark-base">LeSkud</span>
      {shimmer && (
        <span aria-hidden className="leskud-wordmark-shimmer">
          LeSkud
        </span>
      )}
    </span>
  );

  if (href === null) return wordmark;

  return (
    <Link href={href ?? "/"} className="inline-flex shrink-0">
      {wordmark}
    </Link>
  );
}
