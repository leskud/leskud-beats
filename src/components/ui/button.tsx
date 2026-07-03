import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
};

const variants = {
  primary:
    "bg-gold text-background hover:bg-gold-muted disabled:hover:bg-gold",
  outline:
    "border border-border bg-transparent hover:border-gold/50 hover:text-gold",
  ghost: "bg-transparent hover:bg-surface hover:text-foreground",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
