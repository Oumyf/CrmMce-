import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatusBadge, TaskStatus } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { logActivity } from "@/lib/activityLog";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase"; // SUPABASE: Import du client
import {
  AlertCircle,
  Calendar,
  FileText, // Ajoute-le ici
  Flag,
  FolderDot,
  History as HistoryIcon,
  Lock,
  MoreHorizontal,
  Paperclip, // Il est déjà là, donc ne le rajoute pas en bas
  Plus,
  User,
  Users,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react"; // SUPABASE: ajouté useEffect
import { toast } from "sonner"; // Optionnel pour les notifications
// --- INTERFACES ---
interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: "basse" | "moyenne" | "haute";
  start_date: string;
  end_date: string;
  country: string;
  project_id?: string;
  project_name?: string;
  owner_id: string;
  owner_name: string;
  assistants: string[];
  attachments: { name: string, url: string }[] | null;
}

const Tasks = () => {
  const { isAdmin } = useProfile();

  // En situation réelle, on récupèrerait l'id depuis supabase.auth.getSession()
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string }>({
    id: "",
    name: "Chargement...",
  });

  const [availableProjects, setAvailableProjects] = useState<{id: string, name: string}[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [isLoading, setIsLoading] = useState(true); // SUPABASE: État de chargement
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    project_id: "",
    status: "a_faire" as TaskStatus,
    priority: "moyenne" as "basse" | "moyenne" | "haute",
    startDate: "",
    endDate: "",
    assistantsInput: "", 
  });
  
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // SUPABASE: Charger les données au démarrage
  useEffect(() => {
    const getSessionAndData = async () => {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email || "Utilisateur",
        });
      }

      // Charger le reste
      fetchTasks();
      fetchProjects();
    };

    getSessionAndData();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur fetch tasks:", error);
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name');
    if (data) setAvailableProjects(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setTempFiles([...tempFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setTempFiles(tempFiles.filter((_, i) => i !== index));
  };

  // SUPABASE: Mise à jour du statut en base
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
  const oldTask = tasks.find(t => t.id === taskId);
  const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);

  if (!error) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    logTaskAction(taskId, "Changement de statut", oldTask?.status, newStatus); // LOG ICI
    toast.success("Statut mis à jour");
  }
};
      // SUPABASE: Supprimer une tâche
        const deleteTask = async (taskId: string) => {
          if (!confirm("Voulez-vous vraiment supprimer cette tâche ?")) return;

          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

          if (error) {
            toast.error("Erreur lors de la suppression");
          } else {
            const deleted = tasks.find((t) => t.id === taskId);
            if (deleted) void logActivity("task", taskId, deleted.name, "deleted");
            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success("Tâche supprimée");
          }
        };

        // Pour la modification, on peut ouvrir la modal avec les données (optionnel pour l'instant)
        const handleEditClick = (task: Task) => {
          setEditingTask(task);
          setFormData({
            name: task.name,
            description: task.description || "",
            project_id: task.project_id || "",
            status: task.status,
            priority: task.priority,
            startDate: task.start_date || "",
            endDate: task.end_date || "",
            assistantsInput: task.assistants ? task.assistants.join(", ") : "",
          });
          setIsCreateModalOpen(true);
        };
        // SUPABASE: Création de la tâche
        const handleSubmit = async () => {
  if (!formData.name) return toast.error("Le nom est obligatoire");

  // 1. RÉCUPÉRATION DE L'USER SESSION
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return toast.error("Vous devez être connecté pour effectuer cette action");
  }

  try {
    let uploadedAttachments = [];

    // 2. GESTION DES FICHIERS (Upload vers Storage)
    // On ne fait l'upload que s'il y a des nouveaux fichiers dans tempFiles
    if (tempFiles && tempFiles.length > 0) {
      for (const file of tempFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath);

        uploadedAttachments.push({ name: file.name, url: publicUrl });
      }
    }

    const assistantsArray = formData.assistantsInput 
      ? formData.assistantsInput.split(",").map(s => s.trim()) 
      : [];

    const project = availableProjects.find(p => p.id === formData.project_id);

    // 3. PRÉPARATION DU PAYLOAD COMMUN
    // En mode édition, on fusionne les anciens attachments avec les nouveaux
    const finalAttachments = editingTask 
      ? [...(editingTask.attachments || []), ...uploadedAttachments]
      : uploadedAttachments;

    const taskPayload = {
      name: formData.name,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority,
      start_date: formData.startDate || null, 
      end_date: formData.endDate || null,
      project_id: formData.project_id || null,
      project_name: project?.name || null,
      assistants: assistantsArray,
      country: "SN Sénégal",
      attachments: finalAttachments, // Mise à jour de la colonne JSONB
    };

    if (editingTask) {
      // --- MODE MODIFICATION ---
      const { data, error } = await supabase
        .from('tasks')
        .update(taskPayload)
        .eq('id', editingTask.id)
        .select();

      if (error) throw error;

      setTasks(tasks.map(t => t.id === editingTask.id ? data[0] : t));
      void logActivity("task", editingTask.id, taskPayload.name || "Tâche", "updated", `Statut: ${taskPayload.status} · Priorité: ${taskPayload.priority}${taskPayload.project_name ? ` · Projet: ${taskPayload.project_name}` : ""}`);
      toast.success("Tâche modifiée avec succès !");
      setIsCreateModalOpen(false);
      setEditingTask(null);
      resetForm();

    } else {
      // --- MODE CRÉATION ---
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...taskPayload,
          owner_id: user.id,
          owner_name: user.user_metadata?.full_name || user.email,
        }])
        .select();

      if (error) throw error;

      setTasks([data[0], ...tasks]);
      void logActivity("task", data[0].id, taskPayload.name || "Tâche", "created", `Statut: ${taskPayload.status} · Priorité: ${taskPayload.priority}${taskPayload.project_name ? ` · Projet: ${taskPayload.project_name}` : ""}`);
      toast.success("Tâche créée !");
      setIsCreateModalOpen(false);
      resetForm();
    }
    
    // Vider les fichiers temporaires après succès
    setTempFiles([]);

  } catch (error: any) {
    toast.error("Une erreur est survenue");
    console.error("Détail de l'erreur:", error.message || error);
  }
};
            //////////fin handlesubmit///////////
            const logTaskAction = async (taskId: string, action: string, oldVal?: string, newVal?: string) => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              await supabase.from('task_history').insert([{
                task_id: taskId,
                user_id: user.id,
                user_name: user.user_metadata?.full_name || user.email,
                action_type: action,
                old_value: oldVal,
                new_value: newVal
              }]);
            };
  const resetForm = () => {
    setFormData({
      name: "", description: "", project_id: "", status: "a_faire",
      priority: "moyenne", startDate: "", endDate: "", assistantsInput: ""
    });
    setTempFiles([]);
  };

  const handleCloseModal = () => {
  setIsCreateModalOpen(false);
  setEditingTask(null); // On s'assure de quitter le mode édition
  resetForm(); // On vide les champs
};

  // Filtrage local pour la réactivité (search & filters)
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Tâches</h1>
            <p className="text-muted-foreground mt-1">Gérez et suivez toutes vos tâches</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="gap-2 text-xs sm:text-sm">
              <HistoryIcon className="w-4 h-4" /> <span className="hidden sm:inline">Historique</span><span className="sm:hidden">Hist.</span>
            </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">
                <Plus className="w-4 h-4" /> Nouvelle tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Créer une nouvelle tâche</DialogTitle></DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Propriétaire & Responsable</label>
                  <Input value={currentUser.name} disabled className="bg-muted/50 border-dashed" />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Nom de la tâche</label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Configuration du serveur SMTP" />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Projet associé (Optionnel)</label>
                  <Select onValueChange={(v) => setFormData({...formData, project_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                    <SelectContent>
                      {availableProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Détails de la mission..." className="min-h-[80px]" />
                </div>

                <div className="col-span-2 md:col-span-1 space-y-2">
                  <label className="text-sm font-medium">Statut initial</label>
                  <Select defaultValue="a_faire" onValueChange={(v: any) => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_faire">À faire</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="terminee">Terminée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 md:col-span-1 space-y-2">
                  <label className="text-sm font-medium">Priorité</label>
                  <Select defaultValue="moyenne" onValueChange={(v: any) => setFormData({...formData, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basse">Basse</SelectItem>
                      <SelectItem value="moyenne">Moyenne</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date début</label>
                  <Input type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date fin</label>
                  <Input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>

                {/* ZONE UPLOAD */}
                <div className="col-span-2 mt-2">
                  <label className="text-sm font-medium mb-2 block text-primary font-bold">Pièces jointes opérationnelles</label>
                  <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-all">
                    <Paperclip className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter text-primary">AJOUTER PDF, EXCEL OU IMAGES</p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tempFiles.map((file, index) => (
                      <Badge key={index} variant="secondary" className="gap-1 py-1">
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <X className="w-3 h-3 cursor-pointer text-destructive" onClick={() => removeFile(index)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 space-y-2 pt-4 border-t mt-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Assistants sur la tâche (Optionnel)
                  </label>
                  <Input 
                    placeholder="Ex: Lucas D., Aïcha S."
                    value={formData.assistantsInput}
                    onChange={(e) => setFormData({...formData, assistantsInput: e.target.value})}
                  />
                </div>
              </div>

              <DialogFooter>
                {/* 2. Mettez à jour le bouton Annuler */}
                <Button 
                  variant="outline" 
                  onClick={handleCloseModal}>
                  Annuler
                </Button>
                
                <Button onClick={handleSubmit}>
                  {editingTask ? "Enregistrer les modifications" : "Enregistrer la tâche"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* FILTRES */}
        <FilterBar 
          onSearchChange={setSearchQuery} 
          onCountryChange={setSelectedCountry} 
          selectedCountry={selectedCountry}
          additionalFilters={
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px] h-11"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les tâches</SelectItem>
                <SelectItem value="a_faire">À faire</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="terminee">Terminées</SelectItem>
                <SelectItem value="en_retard">En retard</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" count={tasks.length} color="bg-teal-50 text-teal-600" />
          <StatCard label="À faire" count={tasks.filter(t => t.status === 'a_faire').length} color="bg-slate-100 text-slate-600" />
          <StatCard label="En cours" count={tasks.filter(t => t.status === 'en_cours').length} color="bg-blue-100 text-blue-600" />
          <StatCard label="Terminées" count={tasks.filter(t => t.status === 'terminee').length} color="bg-green-100 text-green-600" />
          <StatCard label="En retard" count={tasks.filter(t => t.end_date && new Date(t.end_date) < new Date() && t.status !== 'terminee').length} color="bg-red-100 text-red-600" icon={<AlertCircle className="w-3 h-3 ml-1" />} />
        </div>

        {/* LISTE */}
        <div className="space-y-3">
          {isLoading ? (
             <div className="text-center py-10 text-muted-foreground italic">Chargement des tâches...</div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                currentUserId={currentUser.id}
                isAdmin={isAdmin}
                onStatusChange={updateTaskStatus}
                onDelete={deleteTask}
                onEdit={handleEditClick}
              />
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground italic">Aucune tâche trouvée.</div>
          )}
        </div>

        <HistoryPanel
          entityType="task"
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title="Historique des tâches"
        />
      </div>
    </DashboardLayout>
  );
};

// --- COMPOSANT ITEM (Identique au précédent mais avec les clés owner_id) ---

const TaskItem = ({
  task,
  currentUserId,
  isAdmin,
  onStatusChange,
  onDelete,
  onEdit
}: {
  task: Task,
  currentUserId: string,
  isAdmin: boolean,
  onStatusChange: (id: string, s: TaskStatus) => void,
  onDelete: (id: string) => void,
  onEdit: (task: Task) => void
}) => {
  const canEdit = isAdmin || task.owner_id === currentUserId;
  
  const getFinalStatus = () => {
    if (task.status === "terminee") return "terminee";
    if (task.end_date && new Date(task.end_date) < new Date()) return "en_retard";
    return task.status;
  };
  
  const currentStatus = getFinalStatus();

  return (
    <div className="bg-card border rounded-xl p-4 hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{task.name}</h3>
            <Badge className={`${task.priority === 'haute' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} border-none capitalize`}>
              <Flag className="w-3 h-3 mr-1" /> {task.priority}
            </Badge>
            {task.project_name && (
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                <FolderDot className="w-3 h-3 mr-1" /> {task.project_name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
          
          <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-muted-foreground items-center">
            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {task.owner_name}</span>
            {task.assistants && task.assistants.length > 0 && (
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {task.assistants.join(", ")}</span>
            )}
            
            {/* BLOC DATE + LOGO FILE DÉROULANT */}
                            <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> {task.end_date}
                  </span>

                  {/* LOGO TOUJOURS VISIBLE : Bleu si fichiers, Gris si vide */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className={`flex items-center gap-1 transition-colors focus:outline-none ${
                          task.attachments && task.attachments.length > 0 
                            ? 'text-primary' 
                            : 'text-muted-foreground/30 hover:text-muted-foreground cursor-default'
                        }`}
                        disabled={!task.attachments || task.attachments.length === 0}
                      >
                        <FileText className="w-4 h-4" />
                        {task.attachments && task.attachments.length > 0 && (
                          <span className="text-[10px] font-bold">({task.attachments.length})</span>
                        )}
                      </button>
                    </DropdownMenuTrigger>

                    {/* Le menu ne s'affiche que s'il y a des fichiers */}
                    {task.attachments && task.attachments.length > 0 && (
                      <DropdownMenuContent align="start" className="w-48">
                        {task.attachments.map((file, index) => (
                          <DropdownMenuItem key={index} asChild>
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 w-full cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="truncate text-xs">{file.name}</span>
                            </a>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    )}
                  </DropdownMenu>
                </div>

            <Badge variant="secondary" className="text-[10px] font-bold uppercase">{task.country}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-4">
          <StatusBadge status={currentStatus} />
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><HistoryIcon className="w-4 h-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Changer le statut</div>
                <DropdownMenuItem onClick={() => onStatusChange(task.id, "a_faire")} className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400" /> À faire
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(task.id, "en_cours")} className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" /> En cours
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(task.id, "en_attente")} className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" /> En attente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(task.id, "terminee")} className="gap-2 font-semibold text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Marquer comme terminée
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canEdit ? (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive font-semibold" 
                      onClick={() => onDelete(task.id)}
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem disabled className="flex justify-between items-center italic text-xs">
                    Édition restreinte <Lock className="w-3 h-3" />
                  </DropdownMenuItem>
                )}
                {/* ATTENTION : Supprime le bloc "SECTION PIÈCES JOINTES" qui était ici précédemment */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
);
};

const StatCard = ({ label, count, color, icon }: any) => (
  <div className="bg-card border rounded-xl p-3 text-center shadow-sm">
    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-1 font-bold ${color}`}>{count}</div>
    <p className="flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label} {icon}</p>
  </div>
);

export default Tasks;