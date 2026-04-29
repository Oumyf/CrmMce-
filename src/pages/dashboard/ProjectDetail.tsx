import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle, Calendar, CheckCircle2, ChevronRight,
  FileText, Globe, Loader2, MessageSquare, Pencil, Save, Send, Users, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type ProjectStatus = "en_attente" | "en_cours" | "termine" | "annule" | "abandonne";

interface Profile { id: string; first_name: string; last_name: string; role: string; }
interface ProjectMember {
  profile_id: string;
  profiles: { first_name: string; last_name: string };
}
interface Project {
  id: string; name: string; client_name: string; status: ProjectStatus;
  progress: number; deadline: string; created_at: string; created_by: string;
  real_delivery_date?: string; performance_comments?: string;
  description?: string; country: string;
  project_members: ProjectMember[]; attachments?: string[];
}
interface Task {
  id: string; name: string; status: string; priority: string;
  end_date?: string; owner_name?: string;
}
interface Comment {
  id: string;
  project_id: string;
  author_id: string;
  author_name: string;
  content: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours",   label: "En cours"   },
  { value: "termine",    label: "Terminé"     },
  { value: "annule",     label: "Annulé"      },
  { value: "abandonne",  label: "Abandonné"   },
];

const PRIORITY_COLORS: Record<string, string> = {
  haute:   "bg-red-100 text-red-700",
  moyenne: "bg-orange-100 text-orange-700",
  basse:   "bg-green-100 text-green-700",
};

const TASK_STATUS_MAP: Record<string, { label: string; color: string }> = {
  "a_faire":    { label: "À faire",    color: "bg-slate-100 text-slate-600"  },
  "en_cours":   { label: "En cours",   color: "bg-blue-100 text-blue-700"    },
  "en_attente": { label: "En attente", color: "bg-yellow-100 text-yellow-700"},
  "terminee":   { label: "Terminée",   color: "bg-green-100 text-green-700"  },
  "en_retard":  { label: "En retard",  color: "bg-red-100 text-red-700"      },
};

const getFileName = (url: string) => {
  try {
    const parts = decodeURIComponent(url).split("/");
    return parts[parts.length - 1].replace(/^\d+-/, "");
  } catch { return "Document"; }
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject]         = useState<Project | null>(null);
  const [tasks, setTasks]             = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft]     = useState("");
  const [saving, setSaving]           = useState(false);

  // Comments
  const [comments, setComments]               = useState<Comment[]>([]);
  const [commentText, setCommentText]         = useState("");
  const [sendingComment, setSendingComment]   = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [allProfiles, setAllProfiles]         = useState<Profile[]>([]);
  const [mentionSearch, setMentionSearch]     = useState<string | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin  = ["admin", "administrateur"].includes(String(userProfile?.role || "").toLowerCase());
  const isMember = project?.project_members?.some((m: any) => m.profile_id === userProfile?.id);
  const canEdit  = isAdmin || !!isMember;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) setUserProfile(profile);
      }
      const { data: profilesList } = await supabase.from("profiles").select("id, first_name, last_name, role");
      if (profilesList) setAllProfiles(profilesList);
      if (id) {
        await fetchProject(id);
        await fetchComments(id);
      }
      setLoading(false);
    };
    init();
  }, [id]);

  const fetchProject = async (projectId: string) => {
    const { data: proj } = await supabase
      .from("projects")
      .select(`*, project_members(profile_id, profiles(first_name, last_name))`)
      .eq("id", projectId)
      .single();
    if (proj) { setProject(proj as Project); setDescDraft(proj.description || ""); }

    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, name, status, priority, end_date, owner_name")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks(taskData || []);
  };

  const fetchComments = async (projectId: string) => {
    const { data } = await supabase
      .from("project_comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  };

  const handleCommentTextChange = (text: string) => {
    setCommentText(text);
    const cursorPos = commentTextareaRef.current?.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursorPos);
    const match = beforeCursor.match(/@([^\s]*)$/);
    setMentionSearch(match ? match[1] : null);
  };

  const insertMention = (profile: Profile) => {
    const cursorPos = commentTextareaRef.current?.selectionStart ?? commentText.length;
    const beforeCursor = commentText.slice(0, cursorPos);
    const afterCursor = commentText.slice(cursorPos);
    const match = beforeCursor.match(/@([^\s]*)$/);
    if (match) {
      const newBefore = beforeCursor.slice(0, -match[0].length) + `@${profile.first_name} ${profile.last_name} `;
      setCommentText(newBefore + afterCursor);
    }
    setMentionSearch(null);
    setTimeout(() => commentTextareaRef.current?.focus(), 0);
  };

  const filteredMentionProfiles = mentionSearch !== null
    ? allProfiles
        .filter(p => {
          const full = `${p.first_name} ${p.last_name}`.toLowerCase();
          return full.includes(mentionSearch.toLowerCase());
        })
        .slice(0, 5)
    : [];

  const handleSendComment = async () => {
    if (!commentText.trim() || !userProfile || !project) return;
    setSendingComment(true);

    const { data: newComment, error } = await supabase
      .from("project_comments")
      .insert({
        project_id: project.id,
        author_id: userProfile.id,
        author_name: `${userProfile.first_name} ${userProfile.last_name}`,
        content: commentText.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'envoi du commentaire");
      setSendingComment(false);
      return;
    }

    // Parse @mentions and notify tagged profiles
    const mentionRegex = /@([A-ZÀ-ÿa-z][\w\u00C0-\u017E]* [A-ZÀ-ÿa-z][\w\u00C0-\u017E]*)/g;
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(commentText)) !== null) {
      const mentionName = m[1];
      const mentioned = allProfiles.find(
        p => `${p.first_name} ${p.last_name}`.toLowerCase() === mentionName.toLowerCase()
      );
      if (mentioned && mentioned.id !== userProfile.id) {
        await supabase.from("notifications").insert({
          profile_id: mentioned.id,
          title: "Vous avez été mentionné",
          message: `${userProfile.first_name} ${userProfile.last_name} vous a mentionné dans le projet "${project.name}"`,
          project_id: project.id,
          is_read: false,
        });
      }
    }

    if (newComment) setComments(prev => [...prev, newComment as Comment]);
    setCommentText("");
    setMentionSearch(null);
    setSendingComment(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("project_comments")
      .update({ content: editCommentText.trim(), edited_at: now })
      .eq("id", commentId);
    if (error) { toast.error("Erreur lors de la modification"); return; }
    setComments(prev =>
      prev.map(c => c.id === commentId ? { ...c, content: editCommentText.trim(), edited_at: now } : c)
    );
    setEditingCommentId(null);
    setEditCommentText("");
    toast.success("Commentaire modifié");
  };

  const handleDeleteComment = async (commentId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("project_comments")
      .update({ deleted_at: now })
      .eq("id", commentId);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    setComments(prev =>
      prev.map(c => c.id === commentId ? { ...c, deleted_at: now } : c)
    );
  };

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[\w\u00C0-\u017E]+ [\w\u00C0-\u017E]+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="text-primary font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project || !canEdit) return;
    const { error } = await supabase.from("projects").update({ status: newStatus }).eq("id", project.id);
    if (error) { toast.error("Erreur lors de la mise à jour"); return; }
    setProject({ ...project, status: newStatus });
    toast.success("Statut mis à jour");
  };

  const handleSaveDesc = async () => {
    if (!project) return;
    setSaving(true);
    const { error } = await supabase.from("projects").update({ description: descDraft }).eq("id", project.id);
    setSaving(false);
    if (error) { toast.error("Erreur lors de la sauvegarde"); return; }
    setProject({ ...project, description: descDraft });
    setEditingDesc(false);
    toast.success("Description mise à jour");
  };

  // ── Stats basées sur les tâches (données réelles disponibles) ────────────
  const tasksDone    = tasks.filter(t => t.status === "terminee").length;
  const tasksInProg  = tasks.filter(t => t.status === "en_cours").length;
  const tasksTodo    = tasks.filter(t => t.status === "a_faire" || t.status === "en_attente").length;
  const tasksLate    = tasks.filter(t => t.status === "en_retard").length;
  const isOverdue    = project?.deadline && project.status !== "termine" && new Date(project.deadline) < new Date();

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  );

  if (!project) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Projet introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/projects")}>Retour aux projets</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-12">

        {/* ── Breadcrumb ─────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">MCE</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/dashboard/projects" className="hover:text-foreground transition-colors">Projets</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[250px]">{project.name}</span>
        </nav>

        {/* ── Header ─────────────────────────────────── */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                {project.client_name?.[0]?.toUpperCase() || "P"}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground">{project.client_name}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <Globe className="w-3.5 h-3.5" /><span>{project.country}</span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle className="w-3 h-3" /> En retard
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {canEdit && project.status !== "termine" && (
                <Button size="sm" className="gap-2 h-9" onClick={() => handleStatusChange("termine")}>
                  <CheckCircle2 className="w-4 h-4" /> Marquer terminé
                </Button>
              )}
              {canEdit ? (
                <Select value={project.status} onValueChange={(v) => handleStatusChange(v as ProjectStatus)}>
                  <SelectTrigger className="h-9 w-[145px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={project.status} />
              )}
              {canEdit && (
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs"
                  onClick={() => navigate(`/dashboard/projects?edit=${project.id}`)}>
                  <Pencil className="w-3.5 h-3.5" /> Modifier le projet
                </Button>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-5 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Début :</span>
              <span className="font-medium text-foreground">{new Date(project.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
            {project.deadline && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Délai :</span>
                <span className={`font-medium ${isOverdue ? "text-red-600" : "text-foreground"}`}>
                  {new Date(project.deadline).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
            {project.real_delivery_date && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span>Livraison réelle :</span>
                <span className="font-medium text-green-600">{new Date(project.real_delivery_date).toLocaleDateString("fr-FR")}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Avancement global</span>
              <span className="font-bold text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </div>
        </div>

        {/* ── Stats tâches ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total",      value: tasks.length,  color: "text-foreground",  bg: "bg-card"            },
            { label: "À faire",    value: tasksTodo,     color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/20" },
            { label: "En cours",   value: tasksInProg,   color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/20"     },
            { label: "Terminées",  value: tasksDone,     color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/20"   },
            { label: "En retard",  value: tasksLate,     color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/20"       },
          ].map((s) => (
            <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Contenu principal ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-0 h-auto gap-1 flex-wrap">
                {[
                  { value: "tasks",    label: "Tâches",        count: tasks.length },
                  { value: "files",    label: "Fichiers",       count: project.attachments?.length || 0 },
                  { value: "notes",    label: "Notes",          count: null },
                  { value: "comments", label: "Commentaires",   count: comments.filter(c => !c.deleted_at).length },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-sm gap-1.5"
                  >
                    {tab.label}
                    {tab.count !== null && (
                      <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* TÂCHES */}
              <TabsContent value="tasks" className="mt-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground text-sm border rounded-xl bg-card">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Aucune tâche liée à ce projet.
                    <br />
                    <Link to="/dashboard/tasks" className="text-primary hover:underline text-xs mt-1 inline-block">
                      Créer une tâche →
                    </Link>
                  </div>
                ) : (
                  tasks.map((task) => {
                    const st = TASK_STATUS_MAP[task.status] || { label: task.status, color: "bg-muted text-muted-foreground" };
                    return (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${task.status === "terminee" ? "bg-green-500" : task.status === "en_cours" ? "bg-blue-500" : task.status === "en_retard" ? "bg-red-500" : "bg-slate-300"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{task.name}</p>
                            {task.owner_name && (
                              <p className="text-xs text-muted-foreground">Assignée à {task.owner_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.priority && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority] || "bg-muted"}`}>
                              {task.priority}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                            {st.label}
                          </span>
                          {task.end_date && (
                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {new Date(task.end_date).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              {/* FICHIERS */}
              <TabsContent value="files" className="mt-4 space-y-2">
                {!project.attachments || project.attachments.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground text-sm border rounded-xl bg-card">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    Aucun fichier attaché à ce projet.
                  </div>
                ) : (
                  project.attachments.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors group">
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

              {/* NOTES */}
              <TabsContent value="notes" className="mt-4">
                <div className="border rounded-xl bg-card p-5 space-y-4">
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
                        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveDesc} disabled={saving}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Sauvegarder
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingDesc ? (
                    <Textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)}
                      rows={6} className="text-sm resize-none" placeholder="Décrivez le projet..." />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {project.description || "Aucune description renseignée."}
                    </p>
                  )}
                  {project.performance_comments && (
                    <div className="border-t pt-4 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commentaires de performance</p>
                      <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">{project.performance_comments}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* COMMENTAIRES */}
              <TabsContent value="comments" className="mt-4 space-y-4">
                {/* Liste des messages */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-14 text-muted-foreground text-sm border rounded-xl bg-card">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Aucun commentaire pour l'instant. Soyez le premier à laisser un message !
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const isOwn = comment.author_id === userProfile?.id;
                      const initials = comment.author_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={comment.id} className="flex gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase shrink-0 mt-0.5">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-semibold">{comment.author_name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(comment.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {comment.edited_at && !comment.deleted_at && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  · modifié le {new Date(comment.edited_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>

                            {comment.deleted_at ? (
                              <p className="text-sm text-muted-foreground italic mt-1">[Message supprimé]</p>
                            ) : editingCommentId === comment.id ? (
                              <div className="mt-2 space-y-2">
                                <Textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  rows={3}
                                  className="text-sm resize-none"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleEditComment(comment.id);
                                    if (e.key === "Escape") { setEditingCommentId(null); setEditCommentText(""); }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleEditComment(comment.id)}>
                                    <Save className="w-3 h-3" /> Sauvegarder
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                                    onClick={() => { setEditingCommentId(null); setEditCommentText(""); }}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                                {renderCommentContent(comment.content)}
                              </p>
                            )}

                            {/* Actions */}
                            {isOwn && !comment.deleted_at && editingCommentId !== comment.id && (
                              <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                                  onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}
                                >
                                  Modifier
                                </button>
                                <button
                                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-destructive/10"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Zone de saisie */}
                {userProfile && (
                  <div className="border rounded-xl bg-card p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase shrink-0 mt-0.5">
                        {`${userProfile.first_name?.[0] ?? ""}${userProfile.last_name?.[0] ?? ""}`.toUpperCase()}
                      </div>
                      <div className="flex-1 relative">
                        <Textarea
                          ref={commentTextareaRef}
                          value={commentText}
                          onChange={(e) => handleCommentTextChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSendComment();
                          }}
                          placeholder="Écrivez un commentaire... Utilisez @ pour mentionner quelqu'un"
                          rows={3}
                          className="text-sm resize-none"
                        />
                        {/* Dropdown @mention */}
                        {mentionSearch !== null && filteredMentionProfiles.length > 0 && (
                          <div className="absolute bottom-full mb-1 left-0 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden w-56">
                            {filteredMentionProfiles.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                                onMouseDown={(e) => { e.preventDefault(); insertMention(p); }}
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary uppercase shrink-0">
                                  {p.first_name[0]}{p.last_name[0]}
                                </div>
                                {p.first_name} {p.last_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-11">
                      <p className="text-[11px] text-muted-foreground">Ctrl+Entrée pour envoyer · @nom pour mentionner</p>
                      <Button size="sm" className="gap-1.5 h-8" onClick={handleSendComment} disabled={sendingComment || !commentText.trim()}>
                        {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Envoyer
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Panel droit */}
          <div className="space-y-4">

            {/* Équipe */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" /> Équipe
                </h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {project.project_members?.length || 0}
                </span>
              </div>
              {(!project.project_members || project.project_members.length === 0) ? (
                <p className="text-xs text-muted-foreground">Aucun membre assigné.</p>
              ) : (
                <div className="space-y-2">
                  {project.project_members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase shrink-0">
                        {m.profiles.first_name[0]}{m.profiles.last_name[0]}
                      </div>
                      <span className="text-sm">{m.profiles.first_name} {m.profiles.last_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Informations</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Statut",       value: <StatusBadge status={project.status} /> },
                  { label: "Pays",         value: <span className="font-medium text-sm">{project.country}</span> },
                  { label: "Avancement",   value: <span className="font-medium text-sm">{project.progress}%</span> },
                  { label: "Tâches",       value: <span className="font-medium text-sm">{tasks.length} ({tasksDone} terminée{tasksDone > 1 ? "s" : ""})</span> },
                  { label: "Fichiers",     value: <span className="font-medium text-sm">{project.attachments?.length || 0}</span> },
                  ...(project.deadline ? [{
                    label: "Délai",
                    value: <span className={`font-medium text-sm ${isOverdue ? "text-red-600" : ""}`}>
                      {new Date(project.deadline).toLocaleDateString("fr-FR")}
                    </span>
                  }] : []),
                  ...(project.real_delivery_date ? [{
                    label: "Livraison",
                    value: <span className="font-medium text-sm text-green-600">
                      {new Date(project.real_delivery_date).toLocaleDateString("fr-FR")}
                    </span>
                  }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                    {value}
                  </div>
                ))}
              </div>
            </div>

            {/* Accès rapide */}
            <div className="bg-card border rounded-xl p-4 space-y-1">
              <h3 className="text-sm font-semibold mb-2">Accès rapide</h3>
              <Link to="/dashboard/tasks"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                <CheckCircle2 className="w-4 h-4" /> Gérer les tâches
              </Link>
              <Link to="/dashboard/quotes"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                <FileText className="w-4 h-4" /> Devis
              </Link>
              <Link to="/dashboard/invoices"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted/50">
                <FileText className="w-4 h-4" /> Factures
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;
