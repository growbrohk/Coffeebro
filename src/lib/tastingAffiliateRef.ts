const STORAGE_PREFIX = 'tasting_affiliate_ref:';

function storageKey(packageId: string): string {
  return `${STORAGE_PREFIX}${packageId}`;
}

export function captureAffiliateRef(packageId: string, refParam: string | null | undefined): void {
  const ref = refParam?.trim();
  if (!packageId || !ref) return;
  try {
    sessionStorage.setItem(storageKey(packageId), ref);
  } catch {
    // ignore quota / private mode
  }
}

export function getStoredAffiliateRef(packageId: string): string | null {
  if (!packageId) return null;
  try {
    return sessionStorage.getItem(storageKey(packageId));
  } catch {
    return null;
  }
}

export function clearAffiliateRef(packageId: string): void {
  if (!packageId) return;
  try {
    sessionStorage.removeItem(storageKey(packageId));
  } catch {
    // ignore
  }
}

export function buildTastingAffiliateLink(packageId: string, refCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/tasting-packages/${packageId}?ref=${encodeURIComponent(refCode)}`;
}
