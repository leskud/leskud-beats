import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { cn } from "@/lib/utils";

type YoutubeLinkProps = {
  href: string;
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "subtle";
};

export function YoutubeLink({
  href,
  className,
  showLabel = true,
  variant = "default",
}: YoutubeLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 transition-colors",
        variant === "default" &&
          "rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs text-muted hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400",
        variant === "subtle" &&
          "text-sm text-muted hover:text-red-400",
        className,
      )}
    >
      <YoutubeIcon className="h-3.5 w-3.5 shrink-0" />
      {showLabel && <span>YouTube</span>}
    </a>
  );
}
