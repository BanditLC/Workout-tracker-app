import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type User = {
  id: string;
  email: string;
  name: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const SESSION_KEY = '@workout_tracker:session';
const USERS_KEY = '@workout_tracker:users';

type StoredUser = User & { password: string };

async function getUsers(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const users = await getUsers();

    if (users.some((u) => u.email === trimmedEmail)) {
      return { error: 'An account with this email already exists.' };
    }

    const newUser: StoredUser = {
      id: `user_${Date.now()}`,
      email: trimmedEmail,
      name: name.trim(),
      password,
    };

    await saveUsers([...users, newUser]);
    const session: User = { id: newUser.id, email: newUser.email, name: newUser.name };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return {};
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const users = await getUsers();
    const match = users.find((u) => u.email === trimmedEmail && u.password === password);

    if (!match) {
      return { error: 'Invalid email or password.' };
    }

    const session: User = { id: match.id, email: match.email, name: match.name };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
