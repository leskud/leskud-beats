export function buildFreeDownloadFileQuery(
  beatId: string,
  email: string,
  token: string,
  exp: number,
): string {
  const params = new URLSearchParams({
    beatId,
    token,
    exp: String(exp),
    email,
  });
  return `/api/free-download/file?${params.toString()}`;
}
