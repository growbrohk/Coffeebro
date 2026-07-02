import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { normalizeUsernameHandle } from '@/lib/username';
import { peekPendingReturnTo } from '@/lib/tastingAffiliateRef';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
}

type ProfileFetchResult = {
  data: Profile | null;
  isError: boolean;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileError: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Starts Google OAuth; on success redirects the browser to Google (then back to redirectTo). */
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  /** Set profile username after OAuth when the row still uses a temp_ placeholder. */
  completeUsername: (username: string) => Promise<{ error: Error | null }>;
  retryProfileLoad: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const fetchProfile = async (userId: string): Promise<ProfileFetchResult> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return { data: null, isError: true };
    }
    return { data, isError: false };
  };

  const fetchProfileWithRetry = async (userId: string, maxAttempts = 10): Promise<ProfileFetchResult> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await fetchProfile(userId);
      if (result.isError) {
        return result;
      }
      if (result.data) {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return { data: null, isError: false };
  };

  const resolveProfileForUser = async (
    sessionUser: User,
    maxAttempts = 10,
  ): Promise<ProfileFetchResult> => {
    const retryResult = await fetchProfileWithRetry(sessionUser.id, maxAttempts);
    if (retryResult.isError || !retryResult.data) {
      return retryResult;
    }

    let profileData = retryResult.data;

    if (profileData.username.startsWith('temp_') && sessionUser.user_metadata?.username) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: sessionUser.user_metadata.username.toLowerCase().trim() })
        .eq('user_id', sessionUser.id);

      if (!updateError) {
        const refreshed = await fetchProfile(sessionUser.id);
        if (!refreshed.isError && refreshed.data) {
          profileData = refreshed.data;
        }
      }
    }

    return { data: profileData, isError: false };
  };

  const lastAttemptedUserIdRef = useRef<string | null>(null);

  const applyProfileResult = (result: ProfileFetchResult) => {
    if (result.data) {
      setProfile(result.data);
      setProfileError(false);
    } else {
      setProfile(null);
      setProfileError(true);
    }
    setLoading(false);
  };

  const loadProfileForUser = async (sessionUser: User, maxAttempts = 10) => {
    setProfileError(false);
    setLoading(true);
    const result = await resolveProfileForUser(sessionUser, maxAttempts);
    applyProfileResult(result);
  };

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (!session?.user) {
          lastAttemptedUserIdRef.current = null;
          setProfile(null);
          setProfileError(false);
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        const skipProfileLoad =
          event === 'TOKEN_REFRESHED' ||
          (lastAttemptedUserIdRef.current === userId && event !== 'INITIAL_SESSION');

        if (skipProfileLoad) {
          setLoading(false);
          return;
        }

        setLoading(true);
        // Defer Supabase calls: running them inside the onAuthStateChange
        // callback deadlocks because the auth client still holds its lock.
        const sessionUser = session.user;
        const maxAttempts = event === 'SIGNED_IN' ? 10 : 1;
        setTimeout(async () => {
          const result = await resolveProfileForUser(sessionUser, maxAttempts);
          if (cancelled) return;

          applyProfileResult(result);
          lastAttemptedUserIdRef.current = userId;
        }, 0);
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const retryProfileLoad = () => {
    void (async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      const sessionUser = s?.user;
      if (!sessionUser) return;

      await loadProfileForUser(sessionUser, 3);
    })();
  };

  const signUp = async (email: string, password: string, username: string) => {
    // Check if username is taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return { error: new Error('Username already taken') };
    }

    const pendingReturnTo = peekPendingReturnTo();
    const emailRedirectTo = pendingReturnTo
      ? `${window.location.origin}${pendingReturnTo}`
      : window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          username: username.toLowerCase().trim(),
        },
      }
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      // Wait for trigger to create profile (may have temp username)
      // Poll for profile existence (trigger creates it automatically)
      let profileExists = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!profileExists && attempts < maxAttempts) {
        const result = await fetchProfile(data.user.id);
        if (result.isError) {
          return { error: new Error('Could not load profile. Please try again.') };
        }
        const profileRow = result.data;
        if (profileRow) {
          profileExists = true;
          // Update profile with actual username if it has a temp one
          if (profileRow.username.startsWith('temp_')) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ username: username.toLowerCase().trim() })
              .eq('user_id', data.user.id);

            if (updateError) {
              // If update fails (e.g., user not authenticated due to email confirmation),
              // don't treat it as fatal - the auth state change listener will handle it
              console.warn('Could not update profile username immediately:', updateError.message);
              // Still set the profile so the user can proceed
              setProfile(profileRow);
            } else {
              // Fetch updated profile
              const updatedResult = await fetchProfile(data.user.id);
              if (updatedResult.data) {
                setProfile(updatedResult.data);
              } else {
                setProfile(profileRow);
              }
            }
          } else {
            setProfile(profileRow);
          }
          break;
        }
        // Wait 100ms before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!profileExists) {
        return { error: new Error('Profile creation timed out. Please try again.') };
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  /** Google OAuth: enable provider + secrets in Supabase Dashboard; Google Cloud redirect URI must include `https://mhrbfgathudkequhmvjs.supabase.co/auth/v1/callback`. See supabase/config.toml for `additional_redirect_urls`. */
  const signInWithGoogle = async (redirectTo?: string) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo ?? `${window.location.origin}/profile`,
        queryParams: {
          // login forces an interactive step so the same Google session cannot silently re-link after app sign-out.
          prompt: 'select_account login',
        },
      },
    });
    if (error) {
      return { error };
    }
    if (data.url) {
      window.location.assign(data.url);
      return { error: null };
    }
    return { error: new Error('No OAuth URL returned') };
  };

  const completeUsername = async (username: string) => {
    const normalized = normalizeUsernameHandle(username);
    if (!normalized) {
      return { error: new Error('Username is required') };
    }

    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    const uid = s?.user?.id;
    if (!uid) {
      return { error: new Error('Not signed in') };
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', normalized)
      .maybeSingle();

    if (existing && existing.user_id !== uid) {
      return { error: new Error('Username already taken') };
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: normalized })
      .eq('user_id', uid);

    if (updateError) {
      if (
        updateError.code === '23505' ||
        updateError.message?.toLowerCase().includes('unique')
      ) {
        return { error: new Error('Username already taken') };
      }
      return { error: new Error(updateError.message) };
    }

    await supabase.auth.updateUser({ data: { username: normalized } });

    const updated = await fetchProfile(uid);
    if (updated.data) {
      setProfile(updated.data);
      setProfileError(false);
    }

    return { error: null };
  };

  const signOut = async () => {
    lastAttemptedUserIdRef.current = null;
    setProfile(null);
    setProfileError(false);
    setUser(null);
    setSession(null);
    setLoading(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileError,
        signUp,
        signIn,
        signInWithGoogle,
        completeUsername,
        retryProfileLoad,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
