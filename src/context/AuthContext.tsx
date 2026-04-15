import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Charger le profil depuis la table profiles ────────────────────────────
  const loadProfile = async (u: User) => {
    // Timeout 5s : si Supabase DB est en pause ou lente, on utilise le fallback
    // plutôt que d'attendre indéfiniment.
    const profileQuery = supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, role, avatar_url")
      .eq("id", u.id)
      .single();

    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: new Error("profile_timeout") }),
        5000
      )
    );

    let data: any = null;
    let error: any = null;
    try {
      const result = await Promise.race([profileQuery, timeoutPromise]) as { data: any; error: any };
      data = result.data;
      error = result.error;
    } catch (e) {
      // AbortError ou erreur réseau → on utilise le fallback JWT
      error = e;
    }

    if (!error && data) {
      setProfile({
        id:         data.id,
        first_name: data.first_name,
        last_name:  data.last_name,
        phone:      data.phone,
        role:       data.role,
        avatar_url: data.avatar_url,
        email:      u.email ?? "",
      });
      return;
    }

    // Fallback sur les metadata du JWT (pas de requête DB, instantané)
    const meta = u.user_metadata || {};
    const fallback: Profile = {
      id:         u.id,
      first_name: meta.first_name ?? meta.full_name?.split(" ")[0] ?? null,
      last_name:  meta.last_name  ?? meta.full_name?.split(" ").slice(1).join(" ") ?? null,
      phone:      meta.phone      ?? null,
      role:       meta.role       ?? null,
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
      email:      u.email         ?? "",
    };
    setProfile(fallback);

    // Upsert uniquement si ce n'est pas un timeout (évite de spammer une DB lente)
    if (!error?.message?.includes("profile_timeout")) {
      void (async () => {
        try {
          await supabase.from("profiles").upsert(
            {
              id:         u.id,
              first_name: fallback.first_name,
              last_name:  fallback.last_name,
              phone:      fallback.phone,
              role:       fallback.role,
              avatar_url: fallback.avatar_url,
            },
            { onConflict: "id" }
          );
        } catch {}
      })();
    }
  };

  useEffect(() => {
    let mounted = true;

    // ── 1. getSession — lecture du cache (instantanée, pas de réseau) ─────────
    // Stoppe le loading IMMÉDIATEMENT pour que ProtectedRoute ne reste pas
    // bloqué indéfiniment même si loadProfile est lente en production.
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn("AuthContext: session invalide, nettoyage →", error.message);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Rendre l'utilisateur disponible tout de suite pour ProtectedRoute
        setUser(session.user);
        // Charger le profil en arrière-plan (ne bloque PAS le loading)
        loadProfile(session.user).catch((err) =>
          console.error("AuthContext: loadProfile initial", err)
        );
      }

      // Toujours stopper le loading après getSession (cache = rapide)
      setLoading(false);
    });

    // ── 2. onAuthStateChange — événements en temps réel ───────────────────────
    // Gère les redirects OAuth, refreshes de token, déconnexions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          try {
            await loadProfile(session.user);
          } catch (err) {
            console.error("AuthContext: erreur loadProfile", err);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
        }

        // Forcer loading=false pour tous les événements (SIGNED_IN après OAuth, etc.)
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}