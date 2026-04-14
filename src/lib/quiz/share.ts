import { toBlob } from 'html-to-image';
import { FROG_DESCRIPTIONS, FROG_NAMES, FROG_SHARE_SLUG } from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

/** Square share card canvas size (CSS px); export at 2× via html-to-image. */
export const QUIZ_SHARE_SQUARE_PX = 1080;

const SHARE_CARD_BG = '#f38132';

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

export function buildShareText(resultType: FrogType, origin: string): string {
  const desc = FROG_DESCRIPTIONS[resultType];
  const bestMatchName = FROG_NAMES[desc.bestMatch];
  const url = getSharePageUrl(origin, resultType);
  return `I'm a ${FROG_NAMES[resultType]} 🐸\nBest Match: ${bestMatchName} ☕\nWhat are you?\n\nTake the quiz: ${url}`;
}

export type ShareQuizResultCallbacks = {
  onCopiedText?: () => void;
  onShared?: () => void;
  /** Image saved when share uses clipboard for link (fallback). */
  onDownloaded?: () => void;
  onError?: (message: string) => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Shares quiz link + optional square card PNG (when `shareCardEl` is provided).
 * Tries file share first, then link-only share, then clipboard text; may download PNG as last resort.
 */
export async function shareQuizResult(
  resultType: FrogType,
  callbacks?: ShareQuizResultCallbacks,
  shareCardEl?: HTMLElement | null,
): Promise<void> {
  const origin = getShareOrigin();
  const text = buildShareText(resultType, origin);
  const url = getSharePageUrl(origin, resultType);
  const slug = FROG_SHARE_SLUG[resultType];
  const shareData: ShareData = {
    title: 'CoffeeBro Coffee Quiz',
    text,
    url,
  };

  let imageBlob: Blob | null = null;
  if (shareCardEl) {
    try {
      imageBlob = await toBlob(shareCardEl, {
        cacheBust: true,
        backgroundColor: SHARE_CARD_BG,
        pixelRatio: 2,
        width: QUIZ_SHARE_SQUARE_PX,
        height: QUIZ_SHARE_SQUARE_PX,
      });
    } catch {
      callbacks?.onError?.('Could not create share image');
    }
  }

  if (imageBlob) {
    const file = new File([imageBlob], `coffee-frog-${slug}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ ...shareData, files: [file] });
        callbacks?.onShared?.();
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      callbacks?.onShared?.();
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  let clipboardOk = false;
  try {
    await navigator.clipboard.writeText(text);
    clipboardOk = true;
  } catch {
    callbacks?.onError?.('Could not copy link');
  }

  if (imageBlob) {
    downloadBlob(imageBlob, `coffee-frog-${slug}.png`);
    callbacks?.onDownloaded?.();
  } else if (clipboardOk) {
    callbacks?.onCopiedText?.();
  }
}
