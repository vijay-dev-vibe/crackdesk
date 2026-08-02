import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Call this to trigger the auth modal from anywhere
  requireAuth: (onSuccess?: () => void) => void;
  // Internal — used by AuthModal to register its opener
  _openModal: ((onSuccess?: () => void) => void) | null;
  _setOpenModal: (fn: (onSuccess?: () => void) => void) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  requireAuth: () => {},
  _openModal: null,
  _setOpenModal: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModalFn] = useState<((onSuccess?: () => void) => void) | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setLoading(false);
      } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const requireAuth = (onSuccess?: () => void) => {
    if (user) {
      // Already logged in — just run the action
      onSuccess?.();
    } else {
      // Open the modal
      openModal?.(onSuccess);
    }
  };

  const _setOpenModal = (fn: (onSuccess?: () => void) => void) => {
    setOpenModalFn(() => fn);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, requireAuth, _openModal: openModal, _setOpenModal }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}