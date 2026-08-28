const INVALID_FILENAME = /[^a-zA-Z0-9._-]+/g;

export function safePdfFileName(value: string): string {
  const base = String(value || 'document').split(/[/\\]/).pop() || 'document';
  const stem = base
    .replace(/\.pdf$/i, '')
    .replace(INVALID_FILENAME, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140) || 'document';
  return `${stem}.pdf`;
}

export function pdfResponse(
  bytes: Uint8Array,
  fileName: string,
  disposition: 'attachment' | 'inline' = 'attachment',
): Response {
  const safeName = safePdfFileName(fileName);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${safeName}"`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
