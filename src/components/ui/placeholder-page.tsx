export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-muted">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
        Page en construction — Phase 1 MVP
      </div>
    </div>
  );
}
