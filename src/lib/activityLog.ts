import { supabase } from "./supabase";

export type EntityType =
  | "client"
  | "project"
  | "task"
  | "quote"
  | "invoice"
  | "recruitment";

export type ActionType = "created" | "updated" | "deleted";

export interface ActivityLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name: string;
  action: ActionType;
  details?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

/**
 * Enregistre une action dans la table activity_logs.
 * Échoue silencieusement si la table n'existe pas encore.
 */
export async function logActivity(
  entityType: EntityType,
  entityId: string,
  entityName: string,
  action: ActionType,
  details?: string
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const userName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : user.email || "Inconnu";

    await supabase.from("activity_logs").insert([
      {
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        action,
        details: details || null,
        user_id: user.id,
        user_name: userName,
      },
    ]);
  } catch {
    // Fail silently — the feature is optional; missing table won't break the app
  }
}
