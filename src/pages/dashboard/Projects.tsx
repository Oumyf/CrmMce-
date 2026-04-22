import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FilterBar } from "@/components/shared/FilterBar";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { logActivity } from "@/lib/activityLog";
import { ProjectStatus, StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Eye,
  FileText,
  Globe,
  History as HistoryIcon,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

// Interfaces
interface Profile { id: string; first_name: string; last_name: string; role: string; }
interface Client { id: string; first_name: string; last_name: string; company: string; status: string; }

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
  project_members: { profiles: { first_name: string, last_name: string } }[];
  attachments?: string[];
}

const Projects = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();

  const [isManualEntry, setIsManualEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [confirmedClients, setConfirmedClients] = useState<Client[]>([]);
  
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
      
      fetchData();
    };
    init();
  }, []);

  useEffect(() => {
    const projectIdToOpen = searchParams.get('open');
    
    if (projectIdToOpen && projects.length > 0) {
      const project = projects.find(p => p.id === projectIdToOpen);
      
      if (project) {
        setSelectedProject(project);
        setIsDetailsOpen(true);
        
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('open');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, projects, setSearchParams]);

  const fetchData = async () => {
    const { data: profs, error: profError } = await supabase.from('profiles').select('*');
    if (profs) setAvailableProfiles(profs);
    if (profError) console.error("Erreur Profils:", profError.message);

    const { data: cls, error: clsError } = await supabase
      .from('clients')
      .select('*')
      .ilike('status', 'confirmé');
    if (cls) setConfirmedClients(cls);
    if (clsError) console.error("Erreur Clients:", clsError.message);

    const { data: projs, error: projError } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (
          profile_id,
          profiles (
            first_name,
            last_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (projError) {
      console.error("Erreur Requête Projets:", projError.message);
      toast.error("Erreur lors du chargement des projets");
    } else if (projs) {
      setProjects(projs as any);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    deadline: "",
    created_at: new Date().toISOString().split('T')[0],
    status: "en_attente" as ProjectStatus,
    real_delivery_date: "",
    description: "",
    performance_comments: "",
    country: "Sénégal"
  });

  const isAdminRole = (role?: string | null) => {
    const normalized = String(role || "").toLowerCase();
    return normalized === "admin" || normalized === "administrateur";
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = selectedCountry === "all" || p.country === selectedCountry;
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    return matchesSearch && matchesCountry && matchesStatus;
  });

  const handleDelete = async (project: Project) => {
    if (!isAdminRole(userProfile?.role)) {
      toast.error("Accès refusé : seuls les administrateurs peuvent supprimer un projet.");
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer le projet "${project.name}" ?`)) return;

    try {
      if (project.attachments && project.attachments.length > 0) {
        const filePaths = project.attachments.map(url => {
          const parts = url.split('/project-files/');
          return parts[parts.length - 1];
        });

        await supabase.storage.from('project-files').remove(filePaths);
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      void logActivity("project", project.id, project.name, "deleted");
      toast.success("Projet supprimé définitivement");
      fetchData();

    } catch (error: any) {
      toast.error("Erreur lors de la suppression : " + error.message);
    }
  };

  const handleDeleteFile = async (urlToDelete: string) => {
    if (!selectedProject) return;

    try {
      const parts = urlToDelete.split('/project-files/');
      const filePath = parts[parts.length - 1];

      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      const updatedAttachments = selectedProject.attachments?.filter(url => url !== urlToDelete) || [];

      const { error: dbError } = await supabase
        .from('projects')
        .update({ attachments: updatedAttachments })
        .eq('id', selectedProject.id);

      if (dbError) throw dbError;

      const updatedProject = { ...selectedProject, attachments: updatedAttachments };
      setSelectedProject(updatedProject);
      setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
      
      toast.success("Fichier supprimé");
    } catch (error: any) {
      toast.error("Erreur de suppression: " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isAdmin = isAdminRole(userProfile?.role);
    const isMember = selectedProject?.project_members?.some(
      (m: any) => m.profile_id === currentUser?.id
    );

    if (!selectedProject && !isAdmin) {
      toast.error("Seul un administrateur peut créer un projet.");
      return;
    }

    if (selectedProject && !isAdmin && !isMember) {
      toast.error("Accès refusé.");
      return;
    }

    setUploading(true);

    try {
      const newFileUrls: string[] = [];

      if (selectedFiles.length > 0) {
        const timestamp = Date.now();
        const folderName = formData.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();

        for (const file of selectedFiles) {
          const filePath = `${folderName}/${timestamp}-${file.name}`;
          const { error: uploadError } = await supabase
            .storage
            .from("project-files")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data } = supabase
            .storage
            .from("project-files")
            .getPublicUrl(filePath);

          newFileUrls.push(data.publicUrl);
        }
      }

      const selectedClient = confirmedClients.find(
        (c) => c.id === selectedClientId
      );

      const finalClientName = isManualEntry
        ? formData.client_name
        : selectedClient
        ? `${selectedClient.first_name} ${selectedClient.last_name}`
        : formData.client_name;

      const payload: any = {
        ...formData,
        client_name: finalClientName,
        client_id: isManualEntry ? null : selectedClientId,
        attachments: selectedProject
          ? [...(selectedProject.attachments || []), ...newFileUrls]
          : newFileUrls
      };

      if (!selectedProject) {
        payload.created_by = currentUser?.id;
      }

      let projectId = selectedProject?.id;

      if (selectedProject) {
        delete payload.created_at;
        delete payload.created_by;

        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", selectedProject.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        projectId = data.id;
      }

      if (projectId && isAdmin) {
        const oldMemberIds =
          selectedProject?.project_members?.map(
            (m: any) => m.profile_id
          ) || [];

        if (selectedProject) {
          await supabase
            .from("project_members")
            .delete()
            .eq("project_id", projectId);
        }

        if (selectedMemberIds.length > 0) {
          const membersData = selectedMemberIds.map((id) => ({
            project_id: projectId,
            profile_id: id
          }));

          await supabase
            .from("project_members")
            .insert(membersData);
        }

        const notifications: any[] = [];
        const editorName =
          currentUser?.user_metadata?.first_name || "Un collaborateur";

        const addedIds = selectedMemberIds.filter(
          (id) => !oldMemberIds.includes(id)
        );

        addedIds.forEach((id) => {
          if (id !== currentUser.id) {
            notifications.push({
              profile_id: id,
              title: "🚀 Nouveau projet",
              message: `Vous avez été ajouté au projet "${formData.name}" par ${editorName}`,
              project_id: projectId
            });
          }
        });

        if (notifications.length > 0) {
          await supabase
            .from("notifications")
            .insert(notifications);
        }
      }

      void logActivity(
        "project",
        projectId || "unknown",
        formData.name || "Projet",
        selectedProject ? "updated" : "created",
        `Statut: ${formData.status} · Client: ${formData.client_name}${formData.deadline ? ` · Délai: ${new Date(formData.deadline).toLocaleDateString("fr-FR")}` : ""}`
      );
      toast.success("Opération réussie !");
      setIsDialogOpen(false);
      fetchData();
      resetForm();

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur inattendue");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedProject(null);
    setSelectedMemberIds([]);
    setSelectedClientId("");
    setSelectedFiles([]);
    setIsManualEntry(false);
    setFormData({
      name: "", client_name: "", deadline: "", status: "en_attente",
      created_at: new Date().toISOString().split('T')[0],
      real_delivery_date: "", description: "", performance_comments: "", country: "Sénégal"
    });
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setIsDetailsOpen(true);
  };

  const handleEdit = (project: Project) => {
    const isAdmin = isAdminRole(userProfile?.role);
    const isMember = project.project_members?.some(
      (m: any) => m.profile_id === currentUser?.id
    );

    if (!isAdmin && !isMember) {
      toast.error("Accès refusé.");
      return;
    }

    setSelectedProject(project); 
    
    setFormData({
      name: project.name,
      client_name: project.client_name,
      deadline: project.deadline,
      created_at: project.created_at.split('T')[0],
      status: project.status,
      real_delivery_date: project.real_delivery_date || "",
      description: project.description || "",
      performance_comments: project.performance_comments || "",
      country: project.country
    });

    const memberIds = project.project_members?.map((m: any) => m.profile_id) || [];
    setSelectedMemberIds(memberIds);

    const projAny = project as any;
    if (projAny.client_id) {
      setSelectedClientId(projAny.client_id);
      setIsManualEntry(false);
    } else {
      setIsManualEntry(true);
    }

    setIsDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-0 sm:px-0">
        {/* Header - Responsive */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projets</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Suivi des livrables et performance.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="gap-2 text-xs sm:text-sm flex-1 sm:flex-none">
              <HistoryIcon className="w-4 h-4" /> <span className="hidden sm:inline">Historique</span><span className="sm:hidden">Hist.</span>
            </Button>
            {isAdminRole(userProfile?.role) && (
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 bg-primary flex-1 sm:flex-none">
                <Plus className="w-4 h-4" /> Nouveau projet
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          searchPlaceholder="Rechercher un projet..."
          onSearchChange={setSearchQuery}
          onCountryChange={setSelectedCountry}
          selectedCountry={selectedCountry}
          additionalFilters={
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full lg:w-40 h-11"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProjects.map((project) => {
            const isAdmin = isAdminRole(userProfile?.role);
            const isMember = project.project_members?.some(
              (m: any) => m.profile_id === currentUser?.id
            );

            const canEdit = isAdmin || isMember;
            const canDelete = isAdmin;

            return (
              <ProjectCard
                key={project.id} 
                project={project} 
                onViewDetails={() => handleViewDetails(project)}
                onDelete={() => handleDelete(project)}
                onEdit={() => handleEdit(project)}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            );
          })}
        </div>

        {/* DIALOG DE CRÉATION - Responsive */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader><DialogTitle className="text-lg sm:text-xl">{selectedProject ? `Modifier : ${selectedProject.name}` : "Créer un nouveau projet"}</DialogTitle></DialogHeader>
            
            <div className="flex gap-2 p-1 bg-muted rounded-md mb-4">
              <Button variant={!isManualEntry ? "secondary" : "ghost"} className="flex-1 text-xs sm:text-sm" onClick={() => setIsManualEntry(false)}>Lier Client</Button>
              <Button variant={isManualEntry ? "secondary" : "ghost"} className="flex-1 text-xs sm:text-sm" onClick={() => setIsManualEntry(true)}>Manuel</Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-sm">Nom du projet</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-10" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Pays du projet</Label>
                <Select value={formData.country} onValueChange={v => setFormData({...formData, country: v})}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sénégal">Sénégal</SelectItem>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="Maroc">Maroc</SelectItem>
                    <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{isManualEntry ? "Client" : "Client lié"}</Label>
                {isManualEntry ? (
                  <Input required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="h-10" />
                ) : (
                  <Select onValueChange={setSelectedClientId} value={selectedClientId}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {confirmedClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Date de création</Label>
                <Input type="date" value={formData.created_at} onChange={e => setFormData({...formData, created_at: e.target.value})} className="h-10" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Deadline (Prévue)</Label>
                <Input type="date" required value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="h-10" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Statut actuel</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Date de livraison réelle</Label>
                <Input type="date" value={formData.real_delivery_date} onChange={e => setFormData({...formData, real_delivery_date: e.target.value})} className="h-10" />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-sm">Membres de l'équipe</Label>
                <div className="flex flex-col gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-10 text-sm" type="button">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" /> 
                          {selectedMemberIds.length} membre(s)
                        </div>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[80vw] sm:w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Chercher un membre..." />
                        <CommandGroup className="max-h-60 overflow-y-auto">
                          {availableProfiles.map((p) => (
                            <CommandItem 
                              key={p.id} 
                              onSelect={() => toggleMember(p.id)}
                              className="text-sm"
                            >
                              <Check 
                                className={`mr-2 h-4 w-4 ${
                                  selectedMemberIds.includes(p.id) ? "opacity-100" : "opacity-0"
                                }`} 
                              />
                              {p.first_name} {p.last_name} ({p.role})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMemberIds.map(id => {
                      const profile = availableProfiles.find(p => p.id === id);
                      if (!profile) return null;
                      return (
                        <div 
                          key={id} 
                          className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-medium"
                        >
                          {profile.first_name} {profile.last_name}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-destructive" 
                            onClick={() => toggleMember(id)} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-sm">Documents joints</Label>
                <div 
                  className="border-2 border-dashed border-muted rounded-lg p-4 sm:p-6 hover:bg-muted/50 transition-all cursor-pointer flex flex-col items-center gap-2"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-6 sm:w-8 h-6 sm:h-8 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">Cliquez pour ajouter des fichiers</p>
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    multiple 
                    accept=".pdf,.xlsx,.xls,image/*" 
                    onChange={handleFileChange}
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md text-xs border">
                        <FileText className="w-3 h-3" />
                        <span className="max-w-[120px] sm:max-w-[150px] truncate">{file.name}</span>
                        <X className="w-3 h-3 text-destructive cursor-pointer" onClick={(e) => { e.stopPropagation(); removeFile(idx); }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-sm">Description / Besoins</Label>
                <Textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="text-sm" />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label className="text-sm">Commentaires de performance</Label>
                <Textarea placeholder="Points forts, difficultés..." rows={2} value={formData.performance_comments} onChange={e => setFormData({...formData, performance_comments: e.target.value})} className="text-sm" />
              </div>

              <div className="col-span-1 sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Annuler</Button>
                <Button type="submit" className="bg-primary w-full sm:w-auto" disabled={uploading}>
                  {uploading ? "Envoi..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE DÉTAILS - Responsive */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Info className="w-5 h-5 text-primary" /> Détails du Projet
              </DialogTitle>
            </DialogHeader>

            {selectedProject && (
              <div className="space-y-6 py-4">
                {/* GRILLE D'INFORMATIONS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Nom du projet</Label><p className="font-bold text-sm">{selectedProject.name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Client</Label><p className="font-bold text-sm">{selectedProject.client_name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Pays</Label><p className="flex items-center gap-1 font-bold text-sm"><Globe className="w-3 h-3" />{selectedProject.country}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Statut</Label><div><StatusBadge status={selectedProject.status} /></div></div>
                  <div><Label className="text-muted-foreground text-xs">Date de création</Label><p className="font-medium text-xs">{new Date(selectedProject.created_at).toLocaleDateString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Deadline prévue</Label><p className="font-medium text-xs text-blue-600">{new Date(selectedProject.deadline).toLocaleDateString()}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Livraison réelle</Label><p className="font-medium text-xs">{selectedProject.real_delivery_date ? new Date(selectedProject.real_delivery_date).toLocaleDateString() : "Non livrée"}</p></div>
                </div>

                {/* SECTION DOCUMENTS */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> 
                    Documents
                  </Label>
                  
                  {selectedProject.attachments && selectedProject.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedProject.attachments.map((url, i) => {
                        const isCreator = currentUser?.id === selectedProject.created_by;
                        const fileName = (() => {
                          try {
                            const decoded = decodeURIComponent(url);
                            const parts = decoded.split('/');
                            return parts[parts.length - 1].replace(/^\d+-/, ''); 
                          } catch { return "Document #" + (i + 1); }
                        })();

                        return (
                          <div key={i} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md text-xs border border-blue-200 font-medium group">
                            <button 
                              type="button"
                              onClick={() => window.open(url, '_blank')}
                              className="flex items-center gap-2 hover:underline decoration-blue-400"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="max-w-[100px] sm:max-w-[180px] truncate">{fileName}</span>
                            </button>
                            
                            {isCreator && (
                              <Trash2 
                                className="w-3.5 h-3.5 text-red-500 cursor-pointer hover:scale-110 transition-transform ml-1" 
                                onClick={() => {
                                  if(confirm("Supprimer ce fichier ?")) handleDeleteFile(url);
                                }} 
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div 
                    className="border-2 border-dashed border-muted rounded-lg p-4 sm:p-6 hover:bg-muted/30 transition-all cursor-pointer flex flex-col items-center gap-2 group"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="w-6 sm:w-8 h-6 sm:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">Cliquez pour ajouter</p>
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      multiple 
                      accept=".pdf,.xlsx,.xls,image/*" 
                      onChange={handleFileChange}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Fichiers prêts :</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-md text-xs border border-amber-200">
                            <FileText className="w-3 h-3" />
                            <span className="max-w-[100px] sm:max-w-[150px] truncate text-xs">{file.name}</span>
                            <X className="w-3 h-3 cursor-pointer hover:bg-red-100 rounded-full" onClick={() => removeFile(idx)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ÉQUIPE */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-muted-foreground text-xs uppercase font-bold">Équipe ({selectedProject.project_members?.length || 0})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.project_members?.map((m, i) => (
                      <span key={i} className="bg-secondary/60 border px-2 py-1 rounded-full text-xs font-medium">
                        {m.profiles.first_name} {m.profiles.last_name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-muted-foreground text-xs uppercase font-bold">Description</Label>
                  <p className="text-sm border p-3 rounded-md bg-muted/20 whitespace-pre-wrap leading-relaxed">
                    {selectedProject.description || "Aucune description."}
                  </p>
                </div>

                {/* PERFORMANCE */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-muted-foreground text-xs uppercase font-bold">Performance</Label>
                  <p className="text-sm border p-3 rounded-md bg-muted/20 whitespace-pre-wrap leading-relaxed italic text-muted-foreground">
                    {selectedProject.performance_comments || "Aucun commentaire."}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <HistoryPanel
          entityType="project"
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title="Historique des projets"
        />
      </div>
    </DashboardLayout>
  );
};

const ProjectCard = ({ 
  project, 
  onViewDetails, 
  onDelete, 
  onEdit, 
  canEdit, 
  canDelete 
}: { 
  project: Project, 
  onViewDetails: () => void, 
  onDelete: () => void, 
  onEdit: () => void, 
  canEdit: boolean,
  canDelete: boolean 
}) => {
  const hasFiles = project.attachments && project.attachments.length > 0;
  const isMultiFile = project.attachments && project.attachments.length > 1;

  const getFileName = (url: string) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const parts = decodedUrl.split('/');
      const fileNameWithTimestamp = parts[parts.length - 1];
      return fileNameWithTimestamp.replace(/^\d+-/, '');
    } catch {
      return "Document";
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{project.country}</span>
          </div>
          <h3 className="font-bold text-sm sm:text-lg line-clamp-2">{project.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">{project.client_name}</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              disabled={!canEdit} 
              className={!canEdit ? "opacity-50 cursor-not-allowed" : ""}
              onClick={() => canEdit && onEdit()}
            >
              <Pencil className="w-4 h-4 mr-2" /> Modifier
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              disabled={!canDelete} 
              className={!canDelete ? "opacity-50 cursor-not-allowed text-destructive/50" : "text-destructive"}
              onClick={() => canDelete && onDelete()}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={project.status} />
            {project.deadline && project.status !== "termine" && new Date(project.deadline) < new Date() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                🔴 En retard
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {new Date(project.deadline).toLocaleDateString()}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <Progress value={project.progress} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-4 border-t gap-2 flex-wrap">
          <div className="flex -space-x-2">
            {project.project_members?.slice(0, 3).map((m, i) => (
              <div 
                key={i} 
                title={`${m.profiles.first_name} ${m.profiles.last_name}`} 
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-primary uppercase"
              >
                {m.profiles.first_name[0]}{m.profiles.last_name[0]}
              </div>
            ))}
            {project.project_members && project.project_members.length > 3 && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                +{project.project_members.length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasFiles && (
              isMultiFile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 text-xs">
                      <FileText className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{project.attachments?.length}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-w-[200px] sm:max-w-[240px]">
                    <p className="text-[10px] font-bold text-muted-foreground px-2 py-1.5 uppercase border-b mb-1">Fichiers</p>
                    {project.attachments?.map((url, idx) => (
                      <DropdownMenuItem key={idx} onClick={() => window.open(url, '_blank')} className="cursor-pointer text-xs py-2">
                        <FileText className="mr-2 w-3 h-3 text-blue-500 shrink-0" /> 
                        <span className="truncate">{getFileName(url)}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => window.open(project.attachments![0], '_blank')}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )
            )}

            <Button variant="outline" size="sm" onClick={onViewDetails} className="h-8 text-xs gap-1">
              <Eye className="w-3 h-3" /> Détails
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
