import { FROG_DESCRIPTIONS, FROG_NAMES, FROG_SHARE_SLUG } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

export function frogTypeFromShareSlug(slug: string): FrogType | null {
  const entry = Object.entries(FROG_SHARE_SLUG).find(([, s]) => s === slug);
  return entry ? (entry[0] as FrogType) : null;
}

/**
 * Public origin for shared quiz links. Set `VITE_PUBLIC_SITE_URL` (e.g. `https://coffee-bro.com`)
 * so dev/staging shares use production URLs instead of localhost.
 */
export function getShareOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

/** Canonical share page for link previews (static HTML under `public/q/share/`). */
export function getSharePageUrl(origin: string, resultType: FrogType): string {
  const slug = FROG_SHARE_SLUG[resultType];
  return `${origin.replace(/\/$/, '')}/q/share/${slug}.html`;
}

const DEFAULT_QUIZ_STORE = 'default';

/**
 * Canonical marketing site URL for QR codes (homepage).
 * Uses production host so dev builds still encode the public site, matching `VITE_PUBLIC_SITE_URL` in prod.
 */
export function getCoffeebroMarketingSiteUrl(): string {
  return 'https://www.coffee-bro.com';
}

/** Canonical URL to start the Coffee Quiz (`/q`), for QR invites and links. */
export function getQuizInviteUrl(options?: { storeId?: string; origin?: string }): string {
  const origin = (options?.origin ?? getShareOrigin()).replace(/\/$/, '');
  const base = `${origin}/q`;
  const s = options?.storeId;
  if (s && s !== DEFAULT_QUIZ_STORE) {
    return `${base}?s=${encodeURIComponent(s)}`;
  }
  return base;
}

export function buildShareText(resultType: FrogType, origin: string): string {
  const desc = FROG_DESCRIPTIONS[resultType];
  const bestMatchName = FROG_NAMES[desc.bestMatch];
  const url = getSharePageUrl(origin, resultType);
  return `I'm a ${FROG_NAMES[resultType]} 🐸\nBest Match: ${bestMatchName} ☕\nWhat are you?\n\nTake the quiz: ${url}`;
}

export type ShareQuizResultCallbacks = {
  onCopiedText?: () => void;
  onShared?: () => void;
  onError?: (message: string) => void;
};

/**
 * Shares the quiz result as text + canonical link (Web Share API or clipboard).
 */
export async function shareQuizResult(
  resultType: FrogType,
  callbacks?: ShareQuizResultCallbacks,
): Promise<void> {
  const origin = getShareOrigin();
  const text = buildShareText(resultType, origin);
  const url = getSharePageUrl(origin, resultType);
  const shareData: ShareData = {
    title: 'CoffeeBro Coffee Quiz',
    text,
    url,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      callbacks?.onShared?.();
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    callbacks?.onCopiedText?.();
  } catch {
    callbacks?.onError?.('Could not copy link');
  }
}
