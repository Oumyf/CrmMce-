import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe,
  Loader2,
  MoreHorizontal,
  Pencil,
  Receipt,
  Save,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type ProjectStatus = "en_attente" | "en_cours" | "termine" | "annule";

interface Profile { id: string; first_name: string; last_name: string; role: string; }

interface ProjectMember {
  profile_id: string;
  profiles: { first_name: string; last_name: string };
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  created_at: string;
  created_by: string;
  real_delivery_date?: string;
  performance_comments?: string;
  description?: string;
  country: string;
  project_members: ProjectMember[];
  attachments?: string[];
}

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  end_date?: string;
  owner_name?: string;
}

interface Quote {
  id: string;
  number: string;
  client_name: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface Invoice {
  id: string;
  num: string;
  client: string;
  status: string;
  amount: number;
  due: string;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours",   label: "En cours" },
  { value: "termine",    label: "Terminé" },
  { value: "annule",     label: "Annulé" },
];

const PRIORITY_COLORS: Record<string, string> = {
  haute:   "bg-red-100 text-red-700",
  moyenne: "bg-orange-100 text-orange-700",
  basse:   "bg-green-100 text-green-700",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  "à faire":    "bg-slate-100 text-slate-600",
  "en cours":   "bg-blue-100 text-blue-700",
  "en_cours":   "bg-blue-100 text-blue-700",
  "terminée":   "bg-green-100 text-green-700",
  "termine":    "bg-green-100 text-green-700",
  "en attente": "bg-yellow-100 text-yellow-700",
};

const getFileName = (url: string) => {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split("/");
    return parts[parts.length - 1].replace(/^\d+-/, "");
  } catch {
    return "Document";
  }
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject]     = useState<Project | null>(null);
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [quotes, setQuotes]       = useState<Quote[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

  const isAdmin = ["admin", "administrateur"].includes(
    String(userProfile?.role || "").toLowerCase()
  );
  const isMember = project?.project_members?.some(
    (m: any) => m.profile_id === userProfile?.id
  );
  const canEdit = isAdmin || !!isMember;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("*").eq("id", user.id).single();
        if (profile) setUserProfile(profile);
      }
      if (id) await fetchAll(id);
      setLoading(false);
    };
    init();
  }, [id]);

  const fetchAll = async (projectId: string) => {
    // Project
    const { data: proj } = await supabase
      .from("projects")
      .select(`*, project_members(profile_id, profiles(first_name, last_name))`)
      .eq("id", projectId)
      .single();
    if (proj) {
      setProject(proj as Project);
      setDescDraft(proj.description || "");
    }

    // Tasks linked to this project
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, name, status, priority, end_date, owner_name")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks(taskData || []);

    // Quotes linked by client_name (best effort without foreign key)
    if (proj?.client_name) {
      const { data: quoteData } = await supabase
        .from("quotes")
        .select("id, number, client_name, status, total_amount, created_at")
        .ilike("client_name", proj.client_name)
        .order("created_at", { ascending: false })
        .limit(20);
      setQuotes(quoteData || []);

      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, num, client, status, amount, due")
        .ilike("client", proj.client_name)
        .order("due", { ascending: true })
        .limit(20);
      setInvoices(invoiceData || []);
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project || !canEdit) return;
    const { error } = await supabase
      .from("projects").update({ status: newStatus }).eq("id", project.id);
    if (error) { toast.error("Erreur lors de la mise à jour"); return; }
    setProject({ ...project, status: newStatus });
    toast.success("Statut mis à jour");
  };

  const handleMarkComplete = async () => {
    if (!project || !canEdit) return;
    await handleStatusChange("termine");
  };

  const handleSaveDesc = async () => {
    if (!project) return;
    setSavingDesc(true);
    const { error } = await supabase
      .from("projects").update({ description: descDraft }).eq("id", project.id);
    setSavingDesc(false);
    if (error) { toast.error("Erreur lors de la sauvegarde"); return; }
    setProject({ ...project, description: descDraft });
    setEditingDesc(false);
    toast.success("Description mise à jour");
  };

  // Stats
  const totalBudget  = quotes.reduce((s, q) => s + (q.total_amount || 0), 0);
  const paidAmount   = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const dueAmount    = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const totalFacture = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const isOverdue    = project?.deadline && project.status !== "termine" && new Date(project.deadline) < new Date();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Projet introuvable.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux projets
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">

        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">MCE</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/dashboard/projects" className="hover:text-foreground transition-colors">Projets</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{project.name}</span>
        </nav>

        {/* ── Header card ────────────────────────────────────── */}
        <div className="bg-card border rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Left: name + client */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {project.client_name?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground">{project.client_name}</span>
                  <span>·</span>
                  <Globe className="w-3.5 h-3.5" />
                  <span>{project.country}</span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle className="w-3 h-3" /> En retard
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: status + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && project.status !== "termine" && (
                <Button
                  size="sm"
                  className="gap-2 bg-primary"
                  onClick={handleMarkComplete}
                >
                  <CheckCircle2 className="w-4 h-4" /> Marquer terminé
                </Button>
              )}
              {canEdit ? (
                <Select value={project.status} onValueChange={(v) => handleStatusChange(v as ProjectStatus)}>
                  <SelectTrigger className="h-9 w-[150px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={project.status} />
              )}
              <Button variant="outline" size="icon" className="h-9 w-9"
                onClick={() => navigate(`/dashboard/projects?open=${project.id}`)}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Dates + progress */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Début :</span>
              <span className="font-medium text-foreground">
                {new Date(project.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
            {project.deadline && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Délai :</span>
                <span className={`font-medium ${isOverdue ? "text-red-600" : "text-foreground"}`}>
                  {new Date(project.deadline).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
            {project.real_delivery_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Livraison réelle :</span>
                <span className="font-medium text-green-600">
                  {new Date(project.real_delivery_date).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Avancement</span>
              <span className="font-bold text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "💰", label: "Budget total (devis)",  value: `${totalBudget.toLocaleString("fr-FR")} €`, color: "text-blue-600"  },
            { icon: "✅", label: "Factures payées",       value: `${paidAmount.toLocaleString("fr-FR")} €`,  color: "text-green-600" },
            { icon: "⏳", label: "Montant dû",            value: `${dueAmount.toLocaleString("fr-FR")} €`,   color: "text-orange-500"},
            { icon: "🧾", label: "Total facturé",         value: `${totalFacture.toLocaleString("fr-FR")} €`,color: "text-purple-600"},
          ].map((s) => (
            <div key={s.label} className="bg-card border rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{s.icon} {s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Main content ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="tasks" className="gap-1.5">
                  Tâches <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-bold">{tasks.length}</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1.5">
                  Fichiers <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-bold">{project.attachments?.length || 0}</span>
                </TabsTrigger>
                <TabsTrigger value="quotes" className="gap-1.5">
                  Devis <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-bold">{quotes.length}</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="gap-1.5">
                  Factures <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-bold">{invoices.length}</span>
                </TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              {/* TÂCHES */}
              <TabsContent value="tasks" className="mt-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-card">
                    Aucune tâche liée à ce projet.
                    <br />
                    <Link to="/dashboard/tasks" className="text-primary hover:underline text-xs mt-1 inline-block">
                      Créer une tâche →
                    </Link>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === "terminée" || task.status === "termine" ? "bg-green-500" : task.status === "en cours" || task.status === "en_cours" ? "bg-blue-500" : "bg-slate-300"}`} />
                        <span className="text-sm font-medium truncate">{task.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] || "bg-muted text-muted-foreground"}`}>
                            {task.priority}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TASK_STATUS_COLORS[task.status] || "bg-muted text-muted-foreground"}`}>
                          {task.status}
                        </span>
                        {task.end_date && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            {new Date(task.end_date).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* FICHIERS */}
              <TabsContent value="files" className="mt-4 space-y-2">
                {!project.attachments || project.attachments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-card">
                    Aucun fichier attaché à ce projet.
                  </div>
                ) : (
                  project.attachments.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {getFileName(url)}
                      </span>
                    </a>
                  ))
                )}
              </TabsContent>

              {/* DEVIS */}
              <TabsContent value="quotes" className="mt-4 space-y-2">
                {quotes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-card">
                    Aucun devis trouvé pour ce client.
                  </div>
                ) : (
                  quotes.map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Devis {q.number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold">{q.total_amount?.toLocaleString("fr-FR")} €</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{q.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* FACTURES */}
              <TabsContent value="invoices" className="mt-4 space-y-2">
                {invoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-card">
                    Aucune facture trouvée pour ce client.
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Facture {inv.num}</p>
                        {inv.due && (
                          <p className="text-xs text-muted-foreground">Échéance : {inv.due}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold">{inv.amount?.toLocaleString("fr-FR")} €</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                          {inv.status === "paid" ? "Payée" : inv.status === "overdue" ? "En retard" : "En attente"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* NOTES */}
              <TabsContent value="notes" className="mt-4">
                <div className="border rounded-xl bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Description du projet</h3>
                    {canEdit && !editingDesc && (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7"
                        onClick={() => { setDescDraft(project.description || ""); setEditingDesc(true); }}>
                        <Pencil className="w-3 h-3" /> Modifier
                      </Button>
                    )}
                    {editingDesc && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingDesc(false)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveDesc} disabled={savingDesc}>
                          {savingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Sauvegarder
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingDesc ? (
                    <Textarea
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      rows={6}
                      className="text-sm resize-none"
                      placeholder="Décrivez le projet..."
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {project.description || "Aucune description."}
                    </p>
                  )}

                  {project.performance_comments && (
                    <div className="border-t pt-3 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commentaires performance</p>
                      <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">{project.performance_comments}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: team + info */}
          <div className="space-y-4">

            {/* Team */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" /> Équipe
                </h3>
                <span className="text-xs text-muted-foreground">{project.project_members?.length || 0} membre{(project.project_members?.length || 0) > 1 ? "s" : ""}</span>
              </div>
              {project.project_members?.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun membre assigné.</p>
              )}
              <div className="space-y-2">
                {project.project_members?.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase shrink-0">
                      {m.profiles.first_name[0]}{m.profiles.last_name[0]}
                    </div>
                    <span className="text-sm">{m.profiles.first_name} {m.profiles.last_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional info */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Informations</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pays</span>
                  <span className="font-medium">{project.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avancement</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                {project.deadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Délai</span>
                    <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                      {new Date(project.deadline).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
                {project.real_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison réelle</span>
                    <span className="font-medium text-green-600">
                      {new Date(project.real_delivery_date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tâches</span>
                  <span className="font-medium">{tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fichiers</span>
                  <span className="font-medium">{project.attachments?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold mb-1">Accès rapide</h3>
              <Link to={`/dashboard/tasks?project=${project.id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                <CheckCircle2 className="w-4 h-4" /> Gérer les tâches
              </Link>
              <Link to="/dashboard/quotes"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                <FileText className="w-4 h-4" /> Voir les devis
              </Link>
              <Link to="/dashboard/invoices"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                <Receipt className="w-4 h-4" /> Voir les factures
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;
