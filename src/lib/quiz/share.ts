import { toBlob } from 'html-to-image';
import {
  FROG_DESCRIPTIONS,
  FROG_NAMES,
  FROG_SHARE_CARD_THEME,
  FROG_SHARE_SLUG,
  QUIZ_SHARE_CARD_HEIGHT,
  QUIZ_SHARE_CARD_WIDTH,
} from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

export function frogTypeFromShareSlug(slug: string): FrogType | null {
  const entry = Object.entries(FROG_SHARE_SLUG).find(([, s]) => s === slug);
  return entry ? (entry[0] as FrogType) : null;
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
  /** Link copied to clipboard and PNG downloaded (when Web Share is unavailable). */
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
 * Captures the share card DOM node and shares as PNG when supported; otherwise text + optional PNG download.
 */
export async function shareQuizResult(
  cardEl: HTMLElement | null,
  resultType: FrogType,
  callbacks?: ShareQuizResultCallbacks,
): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const text = buildShareText(resultType, origin);
  const theme = FROG_SHARE_CARD_THEME[resultType];
  const slug = FROG_SHARE_SLUG[resultType];

  if (!cardEl) {
    await copyTextFallback(text, callbacks);
    return;
  }

  let blob: Blob | null = null;
  try {
    blob = await toBlob(cardEl, {
      cacheBust: true,
      backgroundColor: theme.captureBackgroundColor,
      pixelRatio: 2,
      width: QUIZ_SHARE_CARD_WIDTH,
      height: QUIZ_SHARE_CARD_HEIGHT,
    });
  } catch {
    callbacks?.onError?.('Could not create share image');
    await copyTextFallback(text, callbacks);
    return;
  }

  if (!blob) {
    await copyTextFallback(text, callbacks);
    return;
  }

  const file = new File([blob], `coffee-frog-${slug}.png`, { type: 'image/png' });
  const shareData: ShareData = { title: 'CoffeeBro Coffee Quiz', text, url };

  if (navigator.share) {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ ...shareData, files: [file] });
        callbacks?.onShared?.();
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
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
  } catch {
    callbacks?.onError?.('Could not copy link');
    downloadBlob(blob, `coffee-frog-${slug}.png`);
    callbacks?.onDownloaded?.();
    return;
  }

  downloadBlob(blob, `coffee-frog-${slug}.png`);
  callbacks?.onDownloaded?.();
}

async function copyTextFallback(text: string, callbacks?: ShareQuizResultCallbacks) {
  try {
    await navigator.clipboard.writeText(text);
    callbacks?.onCopiedText?.();
  } catch {
    callbacks?.onError?.('Could not copy');
  }
}
