import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState } from "react";

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

  // Guard : empêche deux appels loadProfile simultanés pour le même utilisateur
  // (race condition entre onAuthStateChange INITIAL_SESSION et getSession)
  const loadingForUserId = useRef<string | null>(null);

  // ── Charger le profil depuis la table profiles ────────────────────────────
  const loadProfile = async (u: User) => {
    const profileQuery = supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, role, avatar_url")
      .eq("id", u.id)
      .single();

    // Timeout 5s — évite de bloquer indéfiniment si DB lente ou en pause
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
      // AbortError ou erreur réseau → fallback JWT
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

    // ── onAuthStateChange — SOURCE UNIQUE de vérité ───────────────────────────
    // Couvre INITIAL_SESSION (session en cache), SIGNED_IN, TOKEN_REFRESHED,
    // SIGNED_OUT. Pas besoin d'un getSession() séparé qui causerait un double
    // appel de loadProfile (→ AbortError sur la première requête).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);

          // Charger le profil UNE SEULE FOIS par utilisateur (guard anti-double-appel)
          if (loadingForUserId.current !== session.user.id) {
            loadingForUserId.current = session.user.id;
            loadProfile(session.user)
              .catch((err) => console.error("AuthContext: loadProfile error", err))
              .finally(() => {
                // Libérer le guard pour permettre un refreshProfile ultérieur
                if (loadingForUserId.current === session.user.id) {
                  loadingForUserId.current = null;
                }
              });
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          loadingForUserId.current = null;
        }

        // setLoading(false) IMMÉDIATEMENT — ne pas attendre loadProfile
        setLoading(false);
      }
    );

    // ── Timer de sécurité ─────────────────────────────────────────────────────
    // Si onAuthStateChange ne se déclenche pas dans les 3 premières secondes
    // (rare mais possible), on force loading=false pour éviter tout blocage.
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      loadingForUserId.current = null; // forcer le rechargement
      await loadProfile(user);
    }
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
