/** Lowercase a-z0-9 handle, max 30 chars; empty if nothing usable remains. */
export function normalizeUsernameHandle(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30);
}

/** Derive a handle-style username suggestion from a Google-style display name. */
export function suggestUsernameFromDisplayName(raw: string): string {
  const n = normalizeUsernameHandle(raw);
  return n || 'coffee';
}
