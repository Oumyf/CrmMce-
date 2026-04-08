import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  email?: string;
  avatar_url: string | null;
  country: string | null;
}

// Mise à jour de l'input pour inclure l'avatar_url si nécessaire
type UpdateProfileInput = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  avatar_url?: string;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile({
        ...data,
        email: user.email ?? "",
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfile = async (values: UpdateProfileInput) => {
    if (!profile) return;

    const { error } = await supabase
      .from("profiles")
      .update(values)
      .eq("id", profile.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...values } : prev));
      return { success: true };
    }
    return { success: false, error };
  };

  const isAdminRole = (role?: string | null) => {
    const normalized = String(role || "").toLowerCase();
    return normalized === "admin" || normalized === "administrateur";
  };

  const isAdmin = isAdminRole(profile?.role);

  const displayName =
    profile?.first_name || profile?.last_name
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : profile?.email || "Utilisateur";

  return {
    profile,
    loading,
    updateProfile,
    isAdmin,
    displayName,
    refreshProfile: loadProfile, // Permet de recharger manuellement le profil
  };
}