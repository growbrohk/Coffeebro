import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { useStoreConversionRates } from '@/hooks/useStoreConversionRates';
import { useUserQuizResult } from '@/hooks/useUserQuizResult';
import {
  useLifetimeCoffeeCount,
  useCoffeeProfileStats,
} from '@/hooks/useCoffees';
import { useMyVouchers } from '@/hooks/useMyVouchers';
import { useMyVoucherTopPercent } from '@/hooks/useVouchers';
import { FROG_AVATAR_PATH, FROG_NAMES, FROG_PROFILE_CARD } from '@/lib/quiz/constants';
import { CoffeeCupIcon, COFFEE_CUP_FILL_1, COFFEE_CUP_FILL_2, COFFEE_CUP_FILL_3 } from '@/components/CoffeeCupMark';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings } from 'lucide-react';

/** Profile stat cards — warm cream surface to match design reference */
const profileCardClass =
  'rounded-[1.35rem] border border-[#E8E2D9] bg-[#FAF7F2] p-5 text-[#2E1A14]';

function listLines(items: string[], empty: string) {
  const slots = [0, 1, 2].map((i) => items[i] ?? empty);
  return slots.map((text, i) => (
    <li key={i} className="text-sm font-medium">
      {i + 1}. {text}
    </li>
  ));
}

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const msgParam = searchParams.get('msg');
  const claimParam = searchParams.get('claim');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const getMessage = () => {
    switch (msgParam) {
      case 'tracking':
        return 'Sign-up/log in to start tracking your coffee!';
      case 'view-calendar':
        return "Log in to view other coffee drinkers' calendars.";
      case 'search':
        return 'Log in to search and view other coffee drinkers.';
      case 'messages':
        return 'Log in to message other coffee drinkers.';
      case 'quiz':
        return 'Sign up to unlock your Coffee Frog!';
      default:
        return null;
    }
  };

  const authMessage = getMessage();
  const { user, profile, loading, signIn, signUp, signOut } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [] } = useOrgs();
  const orgIds = orgs.map((o) => o.id);
  const { data: conversionRates = [] } = useStoreConversionRates(orgIds);
  const { data: quizResultType } = useUserQuizResult(user?.id);
  const { data: lifetimeTotal = 0, isLoading: lifetimeLoading } = useLifetimeCoffeeCount();
  const { data: profileStats, isLoading: profileStatsLoading } = useCoffeeProfileStats();
  const { data: vouchers = [], isLoading: vouchersLoading } = useMyVouchers();
  const { data: voucherTopPercent, isLoading: voucherTopLoading } = useMyVoucherTopPercent();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setError('Username is required');
          setIsSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) {
          setError(error.message);
        } else {
          navigate(claimParam ? `/q?claim=${claimParam}` : '/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          navigate(claimParam ? `/q?claim=${claimParam}` : '/');
        }
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSettingsOpen(false);
    await signOut();
  };

  if (user && profile) {
    const frogSubtitle = quizResultType
      ? FROG_NAMES[quizResultType].toLowerCase()
      : 'find your frog';
    const topPlaces = profileStats?.topPlaces ?? [];
    const topDrinks = profileStats?.topDrinks ?? [];
    const voucherCount = vouchers.length;

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="relative z-0 rounded-b-[1.75rem] bg-primary px-4 pb-12 pt-12 text-primary-foreground">
          <button
            type="button"
            className="absolute right-4 top-10 rounded-full p-2 text-primary-foreground/95 hover:bg-white/10"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-6 w-6" strokeWidth={1.75} />
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">{profile.username}</h1>
            <p className="mt-1 text-sm font-medium text-primary-foreground/90">{frogSubtitle}</p>
            <div className="mt-4 flex justify-center">
              <img
                src={
                  quizResultType
                    ? FROG_AVATAR_PATH[quizResultType]
                    : '/profile-frog-hero.png'
                }
                alt={quizResultType ? FROG_NAMES[quizResultType] : ''}
                className="h-40 w-auto max-w-[min(100%,220px)] object-contain"
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-14 space-y-4 px-4">
          {/* Quiz card */}
          <div className={`${profileCardClass} shadow-md`}>
            {quizResultType ? (
              <>
                <p className="text-sm">
                  As an {FROG_NAMES[quizResultType].toLowerCase()}, you are a
                </p>
                <p className="mt-1 text-2xl font-bold capitalize leading-tight">
                  {FROG_PROFILE_CARD[quizResultType].archetype}
                </p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <p className="text-sm text-[#2E1A14]/60">
                    {FROG_PROFILE_CARD[quizResultType].populationPercent}% of the population!
                  </p>
                  <Button
                    type="button"
                    className="h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={() => navigate('/q/result')}
                  >
                    view my result
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-base font-medium leading-snug">
                  Take the quiz to see what coffee frog u are
                </p>
                <p className="mt-2 text-sm text-[#2E1A14]/60">
                  Seven café personalities — which frog matches you?
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    className="h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={() => navigate('/q')}
                  >
                    take my quiz
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Voucher card */}
          <div className={`${profileCardClass} shadow-sm`}>
            <p className="text-sm">You&apos;ve hunted &amp; grabbed</p>
            <p className="mt-1 text-2xl font-bold">
              {vouchersLoading ? '…' : voucherCount}{' '}
              {voucherCount === 1 ? 'voucher' : 'vouchers'}
            </p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              {!voucherTopLoading && voucherTopPercent != null ? (
                <p className="text-sm text-[#2E1A14]/60">
                  Top {voucherTopPercent}% of the population!
                </p>
              ) : voucherTopLoading && voucherCount > 0 ? (
                <p className="text-sm text-[#2E1A14]/60">…</p>
              ) : voucherCount === 0 ? (
                <p className="text-sm text-[#2E1A14]/60">
                  Grab treasures on a hunt to collect vouchers.
                </p>
              ) : (
                <span className="text-sm text-[#2E1A14]/60" aria-hidden>
                  {'\u00a0'}
                </span>
              )}
              <Button
                type="button"
                className="h-9 shrink-0 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate('/leaderboard')}
              >
                view leaderboard
              </Button>
            </div>
          </div>

          {/* Stats card */}
          <div className={`${profileCardClass} shadow-sm`}>
            <p className="text-sm font-medium">In total, you drank</p>
            <div className="mt-1 flex min-h-[4.5rem] items-center justify-between gap-2">
              <span className="text-5xl font-bold tabular-nums">
                {lifetimeLoading ? '…' : lifetimeTotal}
              </span>
              <div className="flex shrink-0 items-center [&>svg+svg]:-ml-3">
                <CoffeeCupIcon fill={COFFEE_CUP_FILL_1} className="h-16 w-16" />
                <CoffeeCupIcon fill={COFFEE_CUP_FILL_2} className="h-16 w-16" />
                <CoffeeCupIcon fill={COFFEE_CUP_FILL_3} className="h-16 w-16" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6 border-t border-[#2E1A14]/12 pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2E1A14]/55">
                  Top cafes
                </p>
                <ol className="mt-2 space-y-1.5">
                  {profileStatsLoading
                    ? listLines([], '…')
                    : listLines(topPlaces, '—')}
                </ol>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2E1A14]/55">
                  Top coffee
                </p>
                <ol className="mt-2 space-y-1.5">
                  {profileStatsLoading
                    ? listLines([], '…')
                    : listLines(topDrinks, '—')}
                </ol>
              </div>
            </div>
          </div>

          {canHostEvent && (
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                onClick={() => navigate('/host/preset-offers')}
                className="w-full btn-run mb-0 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={roleLoading}
              >
                Create / manage offer
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/host/offer-campaign')}
                variant="outline"
                className="w-full btn-run mb-0"
                disabled={roleLoading}
              >
                Create / manage offer campaign
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/host/hunts')}
                variant="outline"
                className="w-full btn-run mb-0"
                disabled={roleLoading}
              >
                Manage Hunts
              </Button>
            </div>
          )}
        </div>

        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-6">
              {conversionRates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    Quiz conversion
                  </h3>
                  {conversionRates.map((cr) => {
                    const org = orgs.find((o) => o.id === cr.store_id);
                    return (
                      <div
                        key={cr.store_id}
                        className="flex items-center justify-between rounded-xl bg-muted/60 p-4"
                      >
                        <div>
                          <p className="font-semibold">{org?.org_name ?? cr.store_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {cr.starts} starts · {cr.signups} signups
                          </p>
                        </div>
                        <p className="text-xl font-black">{cr.conversion_rate}%</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                onClick={handleSignOut}
                className="w-full btn-run btn-run-no"
                variant="outline"
              >
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 border-b border-border bg-background py-4 px-4">
        <h1 className="text-center text-2xl font-black uppercase tracking-tight">
          {isSignUp ? 'Sign Up' : 'Login'}
        </h1>
      </div>

      <div className="container px-4 py-8">
        {authMessage && (
          <div className="mx-auto mb-6 max-w-sm bg-foreground p-4 text-center text-background">
            <p className="font-bold uppercase">{authMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold uppercase">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="runner123"
                className="h-12 text-lg"
                required={isSignUp}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold uppercase">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 text-lg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold uppercase">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 text-lg"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="bg-foreground p-2 text-center text-sm font-medium text-background">{error}</p>
          )}

          <Button type="submit" className="w-full btn-run btn-run-yes" disabled={isSubmitting}>
            {isSubmitting ? 'Loading...' : isSignUp ? 'Create Account' : 'Login'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
