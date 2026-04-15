import { createClient } from "@supabase/supabase-js";

// Fallback vers sessionStorage si localStorage est bloqué (navigation privée Safari, etc.)
function safeStorage(): Storage {
  try {
    localStorage.setItem("__mce_storage_test__", "1");
    localStorage.removeItem("__mce_storage_test__");
    return localStorage;
  } catch {
    return sessionStorage;
  }
}

// ── Nettoyage one-shot des sessions corrompues ────────────────────────────────
// L'ancienne implémentation du calendrier utilisait signInWithOAuth qui
// remplaçait la session admin par une session Google dans localStorage.
// Ce bloc efface cette session une seule fois pour tous les utilisateurs
// existants afin qu'ils puissent se reconnecter proprement.
const MIGRATION_KEY = "crm-mce-session-migration";
const MIGRATION_VERSION = "v2";
try {
  const storage = safeStorage();
  if (storage.getItem(MIGRATION_KEY) !== MIGRATION_VERSION) {
    storage.removeItem("crm-mce-auth");
    storage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
  }
} catch {
  // Ignore si le storage n'est pas accessible
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storage: safeStorage(),
      storageKey: "crm-mce-auth",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
    global: {
      headers: {
        "X-Client-Info": "mce-crm",
      },
    },
    db: {
      schema: "public",
    },
  }
);
