import "server-only";

type PreviewLogPayload = Record<string, unknown>;

export function previewLog(step: string, payload: PreviewLogPayload = {}): void {
  console.info(
    `[preview-generation] ${step}`,
    JSON.stringify({
      step,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

export function previewLogError(
  step: string,
  error: unknown,
  payload: PreviewLogPayload = {},
): void {
  const err = error as NodeJS.ErrnoException & {
    code?: number | string;
    stderr?: string | Buffer;
    stdout?: string | Buffer;
    signal?: string;
  };

  console.error(
    `[preview-generation] ${step}`,
    JSON.stringify({
      step,
      timestamp: new Date().toISOString(),
      error_message: err?.message ?? String(error),
      ffmpeg_exit_code: typeof err?.code === "number" ? err.code : null,
      errno: err?.errno ?? null,
      signal: err?.signal ?? null,
      stderr: truncateLog(err?.stderr),
      stdout: truncateLog(err?.stdout),
      ...payload,
    }),
  );
}

function truncateLog(value: string | Buffer | undefined): string | null {
  if (!value) return null;
  const text = typeof value === "string" ? value : value.toString();
  return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
}
