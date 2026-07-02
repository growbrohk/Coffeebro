import type { TastingPackageTier } from '@/types/tastingPackage';

const STORAGE_PREFIX = 'tasting_affiliate_ref:';
const RETURN_TO_KEY = 'tasting_affiliate_return_to';
const REF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type StoredRef = {
  ref: string;
  ts: number;
};

function storageKey(packageId: string): string {
  return `${STORAGE_PREFIX}${packageId}`;
}

function readStoredRef(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as StoredRef;
    if (typeof parsed.ref === 'string' && typeof parsed.ts === 'number') {
      if (Date.now() - parsed.ts > REF_MAX_AGE_MS) {
        return null;
      }
      return parsed.ref;
    }
  } catch {
    // Legacy plain-string value.
    return raw.trim() || null;
  }
  return null;
}

export function captureAffiliateRef(packageId: string, refParam: string | null | undefined): void {
  const ref = refParam?.trim();
  if (!packageId || !ref) return;
  try {
    const payload: StoredRef = { ref, ts: Date.now() };
    localStorage.setItem(storageKey(packageId), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function getStoredAffiliateRef(packageId: string): string | null {
  if (!packageId) return null;
  try {
    const raw = localStorage.getItem(storageKey(packageId));
    if (!raw) return null;
    const ref = readStoredRef(raw);
    if (!ref) {
      localStorage.removeItem(storageKey(packageId));
    }
    return ref;
  } catch {
    return null;
  }
}

export function clearAffiliateRef(packageId: string): void {
  if (!packageId) return;
  try {
    localStorage.removeItem(storageKey(packageId));
  } catch {
    // ignore
  }
}

export function buildTastingAffiliateLink(packageId: string, refCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/tasting-packages/${packageId}?ref=${encodeURIComponent(refCode)}`;
}

export function buildTastingCheckoutPath(
  packageId: string,
  tier: TastingPackageTier,
  ref?: string | null,
): string {
  const params = new URLSearchParams({ tier });
  const trimmedRef = ref?.trim();
  if (trimmedRef) {
    params.set('ref', trimmedRef);
  }
  return `/tasting-packages/${packageId}/checkout?${params.toString()}`;
}

export function resolveAffiliateRef(packageId: string, urlRef: string | null | undefined): string | undefined {
  const stored = getStoredAffiliateRef(packageId);
  const fromUrl = urlRef?.trim();
  return stored ?? fromUrl ?? undefined;
}

export function setPendingReturnTo(path: string): void {
  if (!path.startsWith('/')) return;
  try {
    localStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // ignore
  }
}

export function peekPendingReturnTo(): string | null {
  try {
    return localStorage.getItem(RETURN_TO_KEY);
  } catch {
    return null;
  }
}

export function consumePendingReturnTo(): string | null {
  try {
    const path = localStorage.getItem(RETURN_TO_KEY);
    if (path) {
      localStorage.removeItem(RETURN_TO_KEY);
    }
    return path;
  } catch {
    return null;
  }
}
