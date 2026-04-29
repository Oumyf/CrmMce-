import { cn } from "@/lib/utils";

export type LeadStatus = "nouveau" | "contacte" | "interesse" | "non_interesse" | "converti";
export type ClientStatus = "contacte" | "injoignable" | "a_rappeler" | "confirme";
export type ProjectStatus = "en_attente" | "en_cours" | "termine" | "annule" | "abandonne";
export type TaskStatus = "a_faire" | "en_cours" | "en_attente" | "terminee" | "en_retard";
export type QuoteStatus = "draft" | "envoye" | "accepte" | "refuse" | "expire";

type Status = LeadStatus | ClientStatus | ProjectStatus | TaskStatus | QuoteStatus;

interface StatusConfig {
  label: string;
  className: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  nouveau: { label: "Nouveau", className: "bg-info/10 text-info border-info/20" },
  contacte: { label: "Contacté", className: "bg-primary/10 text-primary border-primary/20" },
  interesse: { label: "Intéressé", className: "bg-success/10 text-success border-success/20" },
  non_interesse: { label: "Non intéressé", className: "bg-muted text-muted-foreground border-muted" },
  converti: { label: "Converti", className: "bg-accent/10 text-accent border-accent/20" },
  injoignable: { label: "Injoignable", className: "bg-warning/10 text-warning border-warning/20" },
  a_rappeler: { label: "À rappeler", className: "bg-info/10 text-info border-info/20" },
  confirme: { label: "Confirmé", className: "bg-success/10 text-success border-success/20" },
  en_attente: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  en_cours: { label: "En cours", className: "bg-info/10 text-info border-info/20" },
  termine: { label: "Terminé", className: "bg-success/10 text-success border-success/20" },
  annule: { label: "Annulé", className: "bg-destructive/10 text-destructive border-destructive/20" },
  abandonne: { label: "Abandonné", className: "bg-orange-100 text-orange-700 border-orange-200" },
  a_faire: { label: "À faire", className: "bg-muted text-muted-foreground border-muted" },
  terminee: { label: "Terminée", className: "bg-success/10 text-success border-success/20" },
  en_retard: { label: "En retard", className: "bg-destructive/10 text-destructive border-destructive/20" },
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground border-muted" },
  envoye: { label: "Envoyé", className: "bg-info/10 text-info border-info/20" },
  accepte: { label: "Accepté", className: "bg-success/10 text-success border-success/20" },
  refuse: { label: "Refusé", className: "bg-destructive/10 text-destructive border-destructive/20" },
  expire: { label: "Expiré", className: "bg-warning/10 text-warning border-warning/20" },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfigs[status] || { label: status, className: "bg-muted text-muted-foreground" };
  
  return (
    <span className={cn("status-badge border", config.className, className)}>
      {config.label}
    </span>
  );
};