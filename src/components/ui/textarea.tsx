import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground",
        "placeholder:text-muted",
        "focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
