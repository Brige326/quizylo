import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  xp: number;
  streak_days: number;
  last_active_date: string | null;
  league: string;
  is_pro: boolean;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (params: {
    email: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[auth] chargement profil impossible:', error.message);
      return;
    }
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Si la config Supabase manque, on ne tente rien : on sort de l'écran de
    // chargement immédiatement (l'app affichera un état clair, jamais un écran noir).
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }

    // Filet de sécurité : quoi qu'il arrive, on ne reste pas bloqué au chargement.
    const safety = setTimeout(() => {
      if (mounted) setInitializing(false);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          loadProfile(data.session.user.id).finally(() => {
            if (mounted) setInitializing(false);
          });
        } else {
          setInitializing(false);
        }
      })
      .catch((err) => {
        console.warn('[auth] getSession a échoué:', err?.message ?? err);
        if (mounted) setInitializing(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession?.user?.id) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ email, password, fullName }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      // Pas de session => confirmation e-mail requise côté projet.
      return { error: null, needsConfirmation: !data.session };
    },
    [],
  );

  const signIn = useCallback<AuthContextValue['signIn']>(
    async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: error ? error.message : null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, initializing, signUp, signIn, signOut, refreshProfile }),
    [session, profile, initializing, signUp, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
