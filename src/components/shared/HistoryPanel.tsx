import { supabase } from "@/lib/supabase";
import type { EntityType } from "@/lib/activityLog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { History, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  details?: string;
  user_name: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Créé", color: "bg-green-100 text-green-700" },
  updated: { label: "Modifié", color: "bg-blue-100 text-blue-700" },
  deleted: { label: "Supprimé", color: "bg-red-100 text-red-700" },
};

interface HistoryPanelProps {
  entityType: EntityType;
  /** If provided, filters to a specific entity. If omitted, shows all for entityType. */
  entityId?: string;
  maxItems?: number;
}

export const HistoryPanel = ({ entityType, entityId, maxItems = 50 }: HistoryPanelProps) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", entityType)
        .order("created_at", { ascending: false })
        .limit(maxItems);

      if (entityId) {
        query = query.eq("entity_id", entityId);
      }

      const { data, error } = await query;

      if (error) {
        // Table likely doesn't exist yet
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setTableExists(false);
        }
        setLoading(false);
        return;
      }

      setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();
  }, [entityType, entityId, maxItems]);

  if (!tableExists) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
        <History className="w-8 h-8 mx-auto opacity-30" />
        <p className="font-medium">Table d'historique non configurée</p>
        <p className="text-xs max-w-sm mx-auto">
          Créez la table <code className="bg-muted px-1 rounded">activity_logs</code> dans Supabase pour activer le suivi d'activité.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <History className="w-8 h-8 mx-auto opacity-30 mb-2" />
        Aucune activité enregistrée.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const style = ACTION_LABELS[log.action] || { label: log.action, color: "bg-muted text-muted-foreground" };
        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
          >
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${style.color}`}>
              {style.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{log.entity_name}</p>
              {log.details && (
                <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                Par <span className="font-medium">{log.user_name}</span>
                {" · "}
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
