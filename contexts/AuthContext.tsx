import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';
import { fullSyncFromSupabase } from '@/lib/sync';

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithProvider: (provider: 'google' | 'azure') => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    });

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        fullSyncFromSupabase(s.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await getSupabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'azure') => {
    const redirectTo = Platform.OS === 'web'
      ? window.location.origin
      : 'workouttracker://auth/callback';

    const { error } = await getSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signUp,
        signIn,
        signInWithProvider,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
