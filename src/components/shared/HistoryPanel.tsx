import { supabase } from "@/lib/supabase";
import type { EntityType } from "@/lib/activityLog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Clock, History as HistoryIcon, Loader2, Search } from "lucide-react";
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

const ACTION_LABELS: Record<string, string> = {
  created: "Ajouté",
  updated: "Modifié",
  deleted: "Supprimé",
};

const ACTION_SENTENCES: Record<string, (name: string) => string> = {
  created: (name) => `${name} a été ajouté`,
  updated: (name) => `${name} a été modifié`,
  deleted: (name) => `${name} a été supprimé`,
};

interface HistoryPanelProps {
  entityType: EntityType;
  /** If provided, filters to a specific entity. If omitted, shows all for entityType. */
  entityId?: string;
  maxItems?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const HistoryPanel = ({
  entityType,
  entityId,
  maxItems = 50,
  isOpen,
  onClose,
  title = "Historique",
}: HistoryPanelProps) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
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
  }, [entityType, entityId, maxItems, isOpen]);

  const filtered = logs.filter(
    (log) =>
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-[95vw] sm:max-w-md flex flex-col h-full p-4 sm:p-6">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
            <HistoryIcon className="w-5 h-5 text-teal-600" /> {title}
          </SheetTitle>
          <div className="relative mt-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Rechercher..."
              className="w-full pl-8 pr-4 py-2 border rounded-md text-xs sm:text-sm bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
          {!tableExists && (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
              <HistoryIcon className="w-8 h-8 mx-auto opacity-30" />
              <p className="font-medium">Table d'historique non configurée</p>
              <p className="text-xs max-w-sm mx-auto">
                Créez la table{" "}
                <code className="bg-muted px-1 rounded">activity_logs</code>{" "}
                dans Supabase pour activer le suivi d'activité.
              </p>
            </div>
          )}

          {tableExists && loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {tableExists && !loading && filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <HistoryIcon className="w-8 h-8 mx-auto opacity-30 mb-2" />
              Aucune activité enregistrée.
            </div>
          )}

          {tableExists &&
            !loading &&
            filtered.map((log) => {
              const sentence = ACTION_SENTENCES[log.action]
                ? ACTION_SENTENCES[log.action](log.entity_name)
                : `${log.entity_name} — ${log.action}`;
              const badgeColors: Record<string, string> = {
                created: "bg-green-100 text-green-700",
                updated: "bg-blue-100 text-blue-700",
                deleted: "bg-red-100 text-red-700",
              };
              return (
                <div
                  key={log.id}
                  className="relative pl-6 border-l-2 border-slate-100 py-1"
                >
                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-2 border-teal-500" />
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium gap-2">
                      <span className="line-clamp-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(log.created_at).toLocaleString("fr-FR")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full uppercase shrink-0 text-[9px] font-bold ${badgeColors[log.action] || "bg-slate-100 text-slate-600"}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sentence}
                    </p>
                    {log.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {log.details}
                      </p>
                    )}
                    <p className="text-[10px] text-teal-600 font-medium">
                      Par {log.user_name || "Système"}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
