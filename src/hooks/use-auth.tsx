import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const expectedIssuer = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1`;

    const purgeStaleSession = async (s: Session | null) => {
      if (!s?.access_token) return false;
      try {
        const payload = JSON.parse(atob(s.access_token.split(".")[1]));
        if (payload.iss && payload.iss !== expectedIssuer) {
          // Token issued by a different (old) Supabase project — purge it.
          await supabase.auth.signOut();
          try {
            Object.keys(localStorage)
              .filter((k) => k.startsWith("sb-") && !k.includes(import.meta.env.VITE_SUPABASE_PROJECT_ID))
              .forEach((k) => localStorage.removeItem(k));
          } catch {}
          setSession(null);
          return true;
        }
      } catch {}
      return false;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (await purgeStaleSession(newSession)) {
        setLoading(false);
        return;
      }
      setSession(newSession);
      setLoading(false);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      if (await purgeStaleSession(data.session)) {
        setLoading(false);
        return;
      }
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
