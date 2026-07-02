import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { setPendingReturnTo } from '@/lib/tastingAffiliateRef';

export type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSignUp?: boolean;
  title?: string;
  message?: string;
  /** Path to resume after Google OAuth or email confirmation (e.g. checkout URL). */
  returnToPath?: string;
  onSuccess?: () => void;
};

export function AuthDialog({
  open,
  onOpenChange,
  defaultSignUp = true,
  title,
  message,
  returnToPath,
  onSuccess,
}: AuthDialogProps) {
  const uid = useId();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsSignUp(defaultSignUp);
      setError('');
    }
  }, [open, defaultSignUp]);

  const handleReturnToSetup = () => {
    if (returnToPath) {
      setPendingReturnTo(returnToPath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      handleReturnToSetup();

      if (isSignUp) {
        if (!username.trim()) {
          setError('Username is required');
          setIsSubmitting(false);
          return;
        }
        const { error: signUpError } = await signUp(email, password, username);
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      handleReturnToSetup();
      const redirectTo = returnToPath
        ? `${window.location.origin}/profile`
        : `${window.location.origin}/profile`;
      const { error: oauthError } = await signInWithGoogle(redirectTo);
      if (oauthError) {
        setError(oauthError.message);
        setIsSubmitting(false);
      }
    } catch {
      setError('Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? (isSignUp ? 'Sign up' : 'Log in')}</DialogTitle>
          {message ? <DialogDescription>{message}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp ? (
            <div className="space-y-2">
              <Label htmlFor={`${uid}-username`}>Username</Label>
              <Input
                id={`${uid}-username`}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="runner123"
                className="h-11"
                autoComplete="username"
                required={isSignUp}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${uid}-email`}>Email</Label>
            <Input
              id={`${uid}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${uid}-password`}>Password</Label>
            <Input
              id={`${uid}-password`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={6}
            />
          </div>

          {error ? (
            <p className="rounded-md bg-destructive/10 p-2 text-center text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Loading…' : isSignUp ? 'Create account' : 'Log in'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => void handleGoogleSignIn()}
          >
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
