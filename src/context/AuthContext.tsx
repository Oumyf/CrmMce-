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
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, role, avatar_url")
      .eq("id", u.id)
      .single();

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

    // Fallback sur les metadata Google/OAuth si la ligne profiles est absente
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

    // Tenter de créer la ligne profiles pour les prochains chargements
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
  };

  useEffect(() => {
    let mounted = true;

    // ── onAuthStateChange est la source unique de vérité ─────────────────────
    // Il fire INITIAL_SESSION immédiatement avec la session en cache,
    // puis SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT selon les événements.
    // On n'appelle loadProfile QUE depuis ici pour éviter le double appel.
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

        setLoading(false);
      }
    );

    // ── getSession sert uniquement à stopper le loading si pas de session ────
    // (cas navigation privée, premier visit sans session stockée)
    // Si une session existe, INITIAL_SESSION ci-dessus la gère déjà.
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn("AuthContext: session invalide, nettoyage →", error.message);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Pas de session → arrêter le loading immédiatement (redirect vers /login)
      if (!session) {
        setLoading(false);
      }
      // Si session présente : INITIAL_SESSION s'en charge, pas besoin d'agir ici
    });

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