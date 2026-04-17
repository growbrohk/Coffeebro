import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Coffee, Sparkles } from 'lucide-react';
import {
  useLeaderboard,
  type LeaderboardEntry,
  type LeaderboardKind,
  type LeaderboardPeriod,
} from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  FROG_AVATAR_PATH,
  FROG_DEFAULT_GROUP_AVATAR_PATH,
  FROG_NAMES,
  FROG_TYPES,
  LEGACY_FROG_MAP,
} from '@/lib/quiz/constants';
import type { FrogType } from '@/lib/quiz/types';

const BG = '#FDFBF7';
const FG = '#2B1B17';
const ORANGE = '#EF7D31';

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'day', label: 'day' },
  { id: 'week', label: 'week' },
  { id: 'month', label: 'month' },
  { id: 'alltime', label: 'all-time' },
];

function frogAvatarFromQuiz(raw: string | null): { src: string; alt: string } {
  if (!raw) return { src: FROG_DEFAULT_GROUP_AVATAR_PATH, alt: 'CoffeeBro' };
  const key = LEGACY_FROG_MAP[raw] ?? raw;
  if (FROG_TYPES.includes(key as FrogType)) {
    const t = key as FrogType;
    return { src: FROG_AVATAR_PATH[t], alt: FROG_NAMES[t] };
  }
  return { src: FROG_DEFAULT_GROUP_AVATAR_PATH, alt: 'CoffeeBro' };
}

function PodiumAvatar({
  entry,
  size,
  className,
}: {
  entry: LeaderboardEntry;
  size: 'lg' | 'sm';
  className?: string;
}) {
  const { src, alt } = frogAvatarFromQuiz(entry.quiz_result_type);
  const dim = size === 'lg' ? 'h-[88px] w-[88px]' : 'h-[68px] w-[68px]';
  return (
    <div
      className={cn(
        'overflow-hidden rounded-full border-2 bg-white shadow-sm',
        dim,
        className,
      )}
      style={{ borderColor: FG }}
    >
      <img src={src} alt={alt} className="h-full w-full object-contain p-1" />
    </div>
  );
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<LeaderboardKind>('voucher');
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const { data: leaderboard, isLoading } = useLeaderboard(kind, period);
  const { profile, user } = useAuth();

  const countColumnLabel = kind === 'coffee' ? 'Coffee' : 'Voucher(s)';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explore');
    }
  };

  const handleUsernameClick = (userId: string) => {
    if (!user) {
      navigate('/profile?msg=view-calendar');
      return;
    }
    navigate(`/users/${userId}`);
  };

  const top = leaderboard?.slice(0, 3) ?? [];
  const first = top[0];
  const second = top[1];
  const third = top[2];

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: BG, color: FG }}
    >
      <div
        className="sticky top-0 z-10 border-b px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ backgroundColor: BG, borderColor: `${FG}18` }}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-black/5"
            style={{ color: FG }}
            onClick={handleBack}
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1
            className="min-w-0 flex-1 text-center font-heading text-xl font-bold tracking-normal"
            style={{ color: FG }}
          >
            Leaderboard
          </h1>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}
          >
            <SelectTrigger
              className="h-9 w-[min(7.5rem,32vw)] shrink-0 rounded-full border px-2.5 text-xs font-medium shadow-none"
              style={{
                borderColor: FG,
                backgroundColor: BG,
                color: FG,
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {PERIODS.map(({ id, label }) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        <div className="flex flex-wrap items-stretch justify-center gap-2">
          <button
            type="button"
            onClick={() => setKind('voucher')}
            className={cn(
              'inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-center text-xs font-semibold leading-tight transition-colors sm:text-sm',
              kind === 'voucher'
                ? 'border-transparent text-white'
                : 'bg-white',
            )}
            style={
              kind === 'voucher'
                ? { backgroundColor: FG, color: '#fff' }
                : { borderColor: FG, color: FG }
            }
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            grab &amp; hunt voucher
          </button>
          <button
            type="button"
            onClick={() => setKind('coffee')}
            className={cn(
              'inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-center text-xs font-semibold leading-tight transition-colors sm:text-sm',
              kind === 'coffee'
                ? 'border-transparent text-white'
                : 'bg-white',
            )}
            style={
              kind === 'coffee'
                ? { backgroundColor: FG, color: '#fff' }
                : { borderColor: FG, color: FG }
            }
          >
            <Coffee className="h-3.5 w-3.5 shrink-0" />
            coffee drank
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-base font-semibold" style={{ color: FG }}>
              Loading...
            </div>
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <>
            {first && (
              <div className="flex items-end justify-center gap-3 pb-2 pt-2 sm:gap-5">
                {second ? (
                  <div className="flex w-[76px] flex-col items-center gap-1.5 sm:w-[88px]">
                    <PodiumAvatar entry={second} size="sm" />
                    <span className="text-xs font-semibold" style={{ color: FG }}>
                      #2
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        second.user_id && handleUsernameClick(second.user_id)
                      }
                      className="max-w-full truncate text-center text-xs font-medium underline-offset-2 hover:underline"
                      style={{ color: FG }}
                    >
                      {second.username}
                    </button>
                  </div>
                ) : (
                  <div className="w-[76px] sm:w-[88px]" />
                )}

                <div
                  className="flex w-[100px] flex-col items-center gap-1.5 sm:w-[112px]"
                  style={{ marginBottom: second || third ? 12 : 0 }}
                >
                  <PodiumAvatar
                    entry={first}
                    size="lg"
                    className={second || third ? '-translate-y-2' : ''}
                  />
                  <span className="text-sm font-bold" style={{ color: FG }}>
                    #1
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      first.user_id && handleUsernameClick(first.user_id)
                    }
                    className="max-w-full truncate text-center text-sm font-semibold underline-offset-2 hover:underline"
                    style={{ color: FG }}
                  >
                    {first.username}
                  </button>
                </div>

                {third ? (
                  <div className="flex w-[76px] flex-col items-center gap-1.5 sm:w-[88px]">
                    <PodiumAvatar entry={third} size="sm" />
                    <span className="text-xs font-semibold" style={{ color: FG }}>
                      #3
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        third.user_id && handleUsernameClick(third.user_id)
                      }
                      className="max-w-full truncate text-center text-xs font-medium underline-offset-2 hover:underline"
                      style={{ color: FG }}
                    >
                      {third.username}
                    </button>
                  </div>
                ) : (
                  <div className="w-[76px] sm:w-[88px]" />
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: `${FG}20` }}>
              <div
                className="grid grid-cols-[2.5rem_1fr_auto] gap-2 border-b px-3 py-2.5 text-xs font-semibold sm:grid-cols-[3rem_1fr_auto]"
                style={{ borderColor: `${FG}20`, color: `${FG}99` }}
              >
                <div>#</div>
                <div>Coffeebro</div>
                <div className="text-right">{countColumnLabel}</div>
              </div>
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser =
                  !!profile?.user_id && entry.user_id === profile.user_id;

                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[2.5rem_1fr_auto] gap-2 border-b px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[3rem_1fr_auto]"
                    style={{
                      borderColor: `${FG}14`,
                      backgroundColor: isCurrentUser ? ORANGE : 'transparent',
                      color: isCurrentUser ? '#fff' : FG,
                    }}
                  >
                    <div className="tabular-nums">{rank}</div>
                    <div className="min-w-0 font-medium">
                      <button
                        type="button"
                        onClick={() =>
                          entry.user_id && handleUsernameClick(entry.user_id)
                        }
                        className={cn(
                          'truncate text-left hover:underline',
                          isCurrentUser ? 'text-white' : '',
                        )}
                        style={!isCurrentUser ? { color: FG } : undefined}
                      >
                        {entry.username}
                        {isCurrentUser ? ' (you)' : ''}
                      </button>
                    </div>
                    <div className="text-right font-semibold tabular-nums">
                      {entry.run_count}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-12 text-center" style={{ color: `${FG}99` }}>
            <p className="text-lg font-semibold" style={{ color: FG }}>
              No runners yet
            </p>
            <p className="mt-1 text-sm">Be the first to check in!</p>
          </div>
        )}
      </div>
    </div>
  );
}
