import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useMaxStreak } from '@/hooks/useStreak';
import { useMonthCoffeeCount } from '@/hooks/useCoffees';
 import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate, useSearchParams } from 'react-router-dom';
 import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const msgParam = searchParams.get('msg');
  
  // Different message types for different contexts
  const getMessage = () => {
    switch (msgParam) {
      case 'tracking':
        return 'Sign-up/log in to start tracking your coffee!';
      case 'view-calendar':
        return 'Log in to view other coffee drinkers\' calendars.';
      case 'search':
        return 'Log in to search and view other coffee drinkers.';
      case 'messages':
        return 'Log in to message other coffee drinkers.';
      default:
        return null;
    }
  };
  
  const authMessage = getMessage();
  const { user, profile, loading, signIn, signUp, signOut } = useAuth();
  const { data: leaderboard } = useLeaderboard();
  const { data: maxStreak } = useMaxStreak();
  const { data: monthCount = 0 } = useMonthCoffeeCount();
   const { canHostEvent, role, isLoading: roleLoading } = useUserRole();
   const { toast } = useToast();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  // Get user's rank
  const userRank = profile && leaderboard 
    ? leaderboard.findIndex(e => e.username === profile.username) + 1 
    : null;

   const handleHostEvent = () => {
     if (canHostEvent) {
       navigate('/host/event/create');
     } else {
       toast({
         title: 'Access Required',
         description: 'Please upgrade your access to host events.',
       });
     }
   };

   const handleCreateCoffeeOffer = () => {
     if (canHostEvent) {
       navigate('/host/offer/create');
     } else {
       toast({
         title: 'Access Required',
         description: 'Please upgrade your access to host events.',
       });
     }
   };
 
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
          navigate('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Logged in view
  if (user && profile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            Profile
          </h1>
        </div>

        <div className="container px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-black uppercase">
                {profile.username.charAt(0)}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase">{profile.username}</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-muted">
              <div className="text-3xl font-black">{userRank || '-'}</div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mt-1">
                Rank
              </div>
            </div>
            <div className="text-center p-4 bg-muted">
              <div className="text-3xl font-black">
                {monthCount}
              </div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mt-1">
                This Month
              </div>
            </div>
            <div className="text-center p-4 bg-muted">
              <div className="text-3xl font-black">{maxStreak || 0}</div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mt-1">
                Max Streak
              </div>
            </div>
          </div>

           <Button
             onClick={handleCreateCoffeeOffer}
             className="w-full btn-run mb-4 bg-orange-500 hover:bg-orange-600 text-white"
             disabled={roleLoading}
           >
             Create Coffee Offer
           </Button>

           <Button
             onClick={handleHostEvent}
             className="w-full btn-run btn-run-yes mb-4"
             disabled={roleLoading}
           >
             Create Event
           </Button>

          <Button
            onClick={() => navigate('/events/my')}
            className="w-full btn-run btn-run-yes mb-4"
          >
            View Event
          </Button>
 
            {(role === 'run_club_host' || role === 'super_admin') && (
              <Button
                onClick={() => {
                  if (canHostEvent) {
                    navigate('/host/participants');
                  } else {
                    toast({
                      title: 'Access Required',
                      description: 'Please upgrade your access to host events.',
                    });
                  }
                }}
                className="w-full btn-run btn-run-yes mb-4"
                disabled={roleLoading}
              >
                View Participants
              </Button>
            )}
 
          <Button
            onClick={handleSignOut}
            className="w-full btn-run btn-run-no"
            variant="outline"
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  // Login/Signup view
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <h1 className="text-2xl font-black uppercase tracking-tight text-center">
          {isSignUp ? 'Sign Up' : 'Login'}
        </h1>
      </div>

      <div className="container px-4 py-8">
        {authMessage && (
          <div className="max-w-sm mx-auto mb-6 p-4 bg-foreground text-background text-center">
            <p className="font-bold uppercase">{authMessage}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
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
            <p className="text-sm font-medium text-center bg-foreground text-background p-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full btn-run btn-run-yes"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Loading...' : isSignUp ? 'Create Account' : 'Login'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
