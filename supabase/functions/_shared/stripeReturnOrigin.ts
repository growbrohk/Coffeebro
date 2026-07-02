const DEFAULT_APP_URL = 'https://www.coffee-bro.com';

export function appUrl(): string {
  return Deno.env.get('APP_URL') ?? DEFAULT_APP_URL;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isAllowedReturnOrigin(origin: string): boolean {
  const appOrigin = normalizeOrigin(appUrl());
  if (origin === appOrigin) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    if (hostname === 'coffee-bro.com' || hostname === 'www.coffee-bro.com') {
      return protocol === 'https:';
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/** Resolve the base URL for Stripe success/cancel redirects from the caller's origin. */
export function resolveStripeReturnBase(
  bodyOrigin: string | null | undefined,
  requestOriginHeader: string | null,
): string {
  const fallback = appUrl().replace(/\/$/, '');
  const candidates = [bodyOrigin, requestOriginHeader];

  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate);
    if (origin && isAllowedReturnOrigin(origin)) {
      return origin;
    }
  }

  return fallback;
}
