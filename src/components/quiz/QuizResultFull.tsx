import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { HuntTreasureQrCard } from '@/components/campaigns/HuntTreasureQrCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { QuizFrogAvatar } from '@/components/quiz/QuizFrogAvatar';
import { FROG_NAMES, FROG_DESCRIPTIONS, FROG_TYPES } from '@/lib/quiz/constants';
import { getQuizInviteUrl, shareQuizResult } from '@/lib/quiz/share';
import type { FrogType } from '@/lib/quiz/types';

interface QuizResultFullProps {
  resultType: FrogType;
  /** Softmax mix from raw scores; omit when scores unavailable (e.g. legacy row). */
  scorePercentages?: Record<FrogType, number> | null;
  /** When false, hides “Share My Coffee Frog”. */
  shareEnabled?: boolean;
  /** Quiz session store (`?s=`), forwarded into invite QR link when not default. */
  quizStoreId?: string;
}

export function QuizResultFull({
  resultType,
  scorePercentages,
  shareEnabled = true,
  quizStoreId,
}: QuizResultFullProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shareBusy, setShareBusy] = useState(false);
  const [inviteQrOpen, setInviteQrOpen] = useState(false);
  const inviteQuizUrl = useMemo(
    () => getQuizInviteUrl({ storeId: quizStoreId }),
    [quizStoreId],
  );
  const inviteQrReady = Boolean(inviteQuizUrl.trim());
  const desc = FROG_DESCRIPTIONS[resultType];
  const bestMatchName = FROG_NAMES[desc.bestMatch];
  const wildcardName = FROG_NAMES[desc.wildcard];
  const mixOrder =
    scorePercentages != null
      ? [...FROG_TYPES].sort((a, b) => scorePercentages[b]! - scorePercentages[a]!)
      : [];

  const handleShare = useCallback(async () => {
    setShareBusy(true);
    try {
      await shareQuizResult(resultType, {
        onShared: () => toast({ title: 'Shared!' }),
        onCopiedText: () => toast({ title: 'Link copied' }),
        onError: (message) => toast({ title: message, variant: 'destructive' }),
      });
    } finally {
      setShareBusy(false);
    }
  }, [resultType, toast]);

  return (
    <div className="quiz-flow min-h-dvh px-6 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-heading mb-2 text-2xl font-bold tracking-normal text-[var(--quiz-fg)]">
            Your Coffee Frog
          </h1>
          <QuizFrogAvatar resultType={resultType} />
          <p className="mt-2 text-xl font-bold text-[var(--quiz-fg)]">{desc.name}</p>
        </div>

        <div className="rounded-2xl border border-white/25 bg-white/10 p-5">
          <p className="text-sm font-medium leading-relaxed text-[var(--quiz-fg)]/95">{desc.narrative}</p>
          <div className="mt-4 space-y-2 border-t border-white/20 pt-4 text-sm text-[var(--quiz-fg)]">
            <p>
              <span className="font-semibold">Best Match:</span> {bestMatchName}
            </p>
            <p>
              <span className="font-semibold">Wildcard:</span> {wildcardName}
            </p>
          </div>
          {scorePercentages != null && mixOrder.length > 0 ? (
            <div className="mt-4 space-y-2.5 border-t border-white/20 pt-4">
              <p className="text-xs font-semibold tracking-normal text-[var(--quiz-fg)]/80">
                Your mix
              </p>
              {mixOrder.map((t) => {
                const pct = scorePercentages[t] ?? 0;
                return (
                  <div key={t}>
                    <div className="flex justify-between gap-2 text-xs text-[var(--quiz-fg)]/95">
                      <span className="min-w-0 truncate">{FROG_NAMES[t]}</span>
                      <span className="shrink-0 tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[var(--quiz-fg)]/55"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-[var(--quiz-fg)]">
            Track your brews, evolve your frog, and share to find your coffee soulmate.
          </p>
          {shareEnabled ? (
            <>
              <Button
                disabled={shareBusy}
                className="h-12 w-full border-0 bg-[var(--quiz-fg)] font-semibold text-[var(--quiz-bg)] hover:bg-white/90"
                onClick={handleShare}
              >
                {shareBusy ? 'Sharing…' : 'Share My Coffee Frog'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-white/80 bg-transparent font-semibold text-[var(--quiz-fg)] hover:bg-white/10 hover:text-[var(--quiz-fg)]"
                onClick={() => setInviteQrOpen(true)}
              >
                <QrCode className="h-4 w-4 shrink-0" aria-hidden />
                Invite quiz QR
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full border-white/80 bg-transparent text-[var(--quiz-fg)] hover:bg-white/10 hover:text-[var(--quiz-fg)]"
                onClick={() => navigate('/')}
              >
                Start Logging My Coffee
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-white/80 bg-transparent font-semibold text-[var(--quiz-fg)] hover:bg-white/10 hover:text-[var(--quiz-fg)]"
                onClick={() => setInviteQrOpen(true)}
              >
                <QrCode className="h-4 w-4 shrink-0" aria-hidden />
                Invite quiz QR
              </Button>
              <Button
                className="h-12 w-full border-0 bg-[var(--quiz-fg)] font-semibold text-[var(--quiz-bg)] hover:bg-white/90"
                onClick={() => navigate('/')}
              >
                Start Logging My Coffee
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={inviteQrOpen} onOpenChange={setInviteQrOpen}>
        <DialogContent className="max-h-[min(90dvh,720px)] max-w-[min(100vw-1.5rem,20rem)] gap-2 overflow-y-auto rounded-2xl p-4 sm:max-w-[22rem]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">Quiz invite QR</DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              Print or share so friends can take the CoffeeBro quiz in the app.
            </DialogDescription>
          </DialogHeader>
          {inviteQrReady ? (
            <HuntTreasureQrCard
              qrPayload={inviteQuizUrl.trim()}
              campaignId="quiz-invite"
              qrSize={168}
              compact
              className="border-0 bg-transparent p-0 shadow-none"
              campaignTitle="which coffee frog are you?!"
              orgName="coffee frog personality quiz"
              copySuccessDescription="Quiz invite QR card image copied to clipboard."
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
