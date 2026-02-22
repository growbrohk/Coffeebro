import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            if (profileData) {
              // If profile has temp username, try to update it from user metadata
              if (profileData.username.startsWith('temp_') && session.user.user_metadata?.username) {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ username: session.user.user_metadata.username.toLowerCase().trim() })
                  .eq('user_id', session.user.id);
                
                if (!updateError) {
                  // Fetch updated profile
                  const updatedProfile = await fetchProfile(session.user.id);
                  setProfile(updatedProfile || profileData);
                } else {
                  setProfile(profileData);
                }
              } else {
                setProfile(profileData);
              }
            }
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
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
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          profileExists = true;
          // Update profile with actual username if it has a temp one
          if (profile.username.startsWith('temp_')) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ username: username.toLowerCase().trim() })
              .eq('user_id', data.user.id);
            
            if (updateError) {
              // If update fails (e.g., user not authenticated due to email confirmation),
              // don't treat it as fatal - the auth state change listener will handle it
              console.warn('Could not update profile username immediately:', updateError.message);
              // Still set the profile so the user can proceed
              setProfile(profile);
            } else {
              // Fetch updated profile
              const updatedProfile = await fetchProfile(data.user.id);
              if (updatedProfile) {
                setProfile(updatedProfile);
              } else {
                setProfile(profile);
              }
            }
          } else {
            setProfile(profile);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
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
