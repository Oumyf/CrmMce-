// Ajoute ces imports en haut
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Column, DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { ClientStatus, StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/activityLog";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
// Remplacez votre ligne lucide-react par celle-ci
import { Eye, FileText, FileUp, History as HistoryIcon, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
// Interface correspondant exactement à ta table SQL
interface Client {
  id: string;
  last_name: string;
  first_name: string;
  profession: string;
  email: string;
  phone: string;
  address: string;
  domain: string;
  needs: string;
  country: string;
  status: ClientStatus;
  created_by: string;
  created_at: string;
  // Ajoute cette ligne pour la jointure :
  profiles?: {
    first_name: string;
    last_name: string;
  };
}
interface ClientDocument {
  id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
}
const countryPrefixes: { [key: string]: string } = {
  "Sénégal": "+221",
  "France": "+33",
  "Maroc": "+212",
  "Côte d'Ivoire": "+225"
};

const Clients = () => {
  const { isAdmin } = useProfile();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // États pour les filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");

  // État pour le pays sélectionné dans le formulaire (pour le préfixe)
const [formCountry, setFormCountry] = useState("Sénégal");
const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false);
const [selectedClientForDocs, setSelectedClientForDocs] = useState<Client | null>(null);
const [documents, setDocuments] = useState<ClientDocument[]>([]);
const [loadingDocs, setLoadingDocs] = useState(false);
const [isDetailsOpen, setIsDetailsOpen] = useState(false);
const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
const [isHistoryOpen, setIsHistoryOpen] = useState(false);
const fetchClients = async () => {
  try {
    setLoading(true);
    // On précise à Supabase d'utiliser la clé étrangère created_by
    const { data, error } = await supabase
      .from("clients")
      .select(`
        *,
        profiles!created_by (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur Supabase précise:", error);
      throw error;
    }
    setClients(data || []);
  } catch (error: any) {
    console.error("Erreur détaillée:", error);
    toast.error("Erreur de chargement des clients");
  } finally {
    setLoading(false);
  }
};

 // 2. Modifie le useEffect pour récupérer l'utilisateur au démarrage
useEffect(() => {
  const getSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };
  
  getSession();
  fetchClients();
}, []);

  // Synchronise le pays du formulaire quand on édite un client
  useEffect(() => {
    if (editingClient) {
      setFormCountry(editingClient.country || "Sénégal");
    } else {
      setFormCountry("Sénégal");
    }
  }, [editingClient, isDialogOpen]);
////////////////////////////////////////////////////////////



  // Récupérer la liste des documents pour le client sélectionné
  const fetchDocuments = async (clientId: string) => {
    setLoadingDocs(true);
    const { data, error } = await supabase
      .from("client_documents")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (!error) setDocuments(data || []);
    setLoadingDocs(false);
  };

  // Effet pour charger les docs quand on ouvre la modale
  useEffect(() => {
    if (selectedClientForDocs) fetchDocuments(selectedClientForDocs.id);
  }, [selectedClientForDocs]);

  // Fonction pour visionner (ouvre dans un nouvel onglet)
  const handleViewFile = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('client-files')
      .createSignedUrl(filePath, 3600); // Lien valide 1 heure

    if (error) return toast.error("Erreur d'accès au fichier");
    window.open(data.signedUrl, '_blank');
  };

  // Fonction pour supprimer un document
  const handleDeleteDoc = async (doc: ClientDocument) => {
    if (!confirm("Supprimer ce document ?")) return;

    try {
      // 1. Supprimer du Storage
      await supabase.storage.from('client-files').remove([doc.file_path]);
      // 2. Supprimer de la base
      await supabase.from('client_documents').delete().eq('id', doc.id);
      
      toast.success("Document supprimé");
      fetchDocuments(doc.client_id);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // --- AJOUTER ICI ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, clientId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limiter la taille (ex: 5Mo)
    if (file.size > 5 * 1024 * 1024) return toast.error("Fichier trop volumineux (max 5Mo)");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Math.random()}.${fileExt}`;

      // 1. Upload vers le Storage (Bucket client-files)
      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Enregistrement dans la table client_documents
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert([{
          client_id: clientId,
          file_name: file.name,
          file_path: filePath,
          uploaded_by: user.id
        }]);

      if (dbError) throw dbError;

      toast.success(`Fichier "${file.name}" ajouté`);
    } catch (error: any) {
      toast.error("Erreur d'upload : " + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      return toast.error("Session expirée, veuillez vous reconnecter");
    }

    const clientData = {
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      profession: formData.get("profession"),
      domain: formData.get("domain"),
      address: formData.get("address"),
      needs: formData.get("needs"),
      country: formData.get("country"),
      status: formData.get("status") || "Contacté",
      created_by: user.id 
    };

    try {
      if (editingClient) {
        const { error } = await supabase.from("clients").update(clientData).eq("id", editingClient.id);
        if (error) throw error;
        toast.success("Client mis à jour avec succès");
      } else {
        const { error } = await supabase.from("clients").insert([clientData]).select().single();
        if (error) throw error;
        toast.success("Nouveau client ajouté");
      }
      setIsDialogOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;
    try {
      const clientToDelete = clients.find((c) => c.id === id);
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      toast.success("Client supprimé");
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

// 1. Logique de filtrage (reste identique mais bien placée avant les colonnes)
const filteredClients = clients.filter((client) => {
  const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
  const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                       client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       client.phone?.includes(searchQuery);
  
  // Utilisation de .toLowerCase() pour éviter les erreurs de casse (ex: Contacté vs contacté)
  const matchesStatus = selectedStatus === "all" || 
                       client.status?.toLowerCase() === selectedStatus.toLowerCase();

  // Comparaison flexible pour le pays
  const matchesCountry = selectedCountry === "all" || 
                        client.country?.toLowerCase() === selectedCountry.toLowerCase();
  
  return matchesSearch && matchesStatus && matchesCountry;
});

// 2. Définition des colonnes avec protection des actions
const columns: Column<Client>[] = [
  {
    key: "name",
    header: "Client",
    render: (client) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{client.first_name} {client.last_name}</span>
        <span className="text-xs text-muted-foreground">{client.email}</span>
      </div>
    ),
  },
  { key: "phone", header: "Téléphone" },
  { key: "profession", header: "Profession" },
  {
    key: "status",
    header: "Statut",
    render: (client) => <StatusBadge status={client.status} />,
  },
  {
    key: "actions",
    header: "",
    className: "w-20",
    render: (client) => {
      // Admin OU propriétaire peuvent modifier/supprimer
      const canEdit = isAdmin || currentUserId === client.created_by;

      return (
        <div className="flex items-center gap-1">
          {/* ICONE UPLOAD DIRECT : Grisée si pas owner/admin */}
          <label
            className={`p-2 rounded-full transition-all ${
              !canEdit
                ? "opacity-20 cursor-not-allowed text-muted-foreground"
                : "cursor-pointer hover:bg-secondary text-primary"
            }`}
            title={canEdit ? "Uploader un fichier" : "Accès restreint"}
          >
            <FileUp className="w-4 h-4" />
            {canEdit && (
              <input
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => handleFileUpload(e, client.id)}
              />
            )}
          </label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* DOCUMENT : Toujours accessible en lecture */}
              <DropdownMenuItem onClick={() => { setSelectedClientForDocs(client); setIsDocsDialogOpen(true); }}>
                <FileText className="w-4 h-4 mr-2" /> Documents
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => { 
                setSelectedClientDetails(client); 
                setIsDetailsOpen(true); 
              }}>
                <Eye className="w-4 h-4 mr-2" /> Détails
              </DropdownMenuItem>

              <div className="h-px bg-muted my-1" />

              {/* MODIFIER : Accessible si owner ou admin */}
              <DropdownMenuItem
                disabled={!canEdit}
                onClick={() => { setEditingClient(client); setIsDialogOpen(true); }}
                className={!canEdit ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Pencil className="w-4 h-4 mr-2" /> Modifier
              </DropdownMenuItem>

              {/* SUPPRIMER : Accessible si owner ou admin */}
              <DropdownMenuItem
                disabled={!canEdit}
                onClick={() => handleDelete(client.id)}
                className={canEdit ? "text-destructive" : "opacity-50 cursor-not-allowed"}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
]
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Gérez votre base de données clients et leurs besoins.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="gap-2 text-xs sm:text-sm">
              <HistoryIcon className="w-4 h-4" /> <span className="hidden sm:inline">Historique</span><span className="sm:hidden">Hist.</span>
            </Button>
            <Button onClick={() => { setEditingClient(null); setIsDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Nouveau client
            </Button>
          </div>
        </div>

        <FilterBar 
          onSearchChange={setSearchQuery} 
          onCountryChange={setSelectedCountry}
          selectedCountry={selectedCountry}
          additionalFilters={
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="contacté">Contacté</SelectItem>
                <SelectItem value="injoignable">Injoignable</SelectItem>
                <SelectItem value="à_rappeler">À rappeler</SelectItem>
                <SelectItem value="confirmé">Confirmé</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <Dialog open={isDialogOpen} onOpenChange={(open) => { 
          setIsDialogOpen(open); 
          if(!open) setEditingClient(null); 
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Modifier le profil client" : "Ajouter un nouveau client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input name="first_name" defaultValue={editingClient?.first_name} required />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input name="last_name" defaultValue={editingClient?.last_name} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editingClient?.email} required />
              </div>

              <div className="space-y-2">
                <Label>Pays</Label>
                <Select 
                  name="country" 
                  defaultValue={editingClient?.country || "Sénégal"}
                  onValueChange={(val) => setFormCountry(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sénégal">Sénégal (+221)</SelectItem>
                    <SelectItem value="France">France (+33)</SelectItem>
                    <SelectItem value="Maroc">Maroc (+212)</SelectItem>
                    <SelectItem value="Côte d'Ivoire">Côte d'Ivoire (+225)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input 
                  name="phone" 
                  key={formCountry}
                  defaultValue={editingClient?.phone || countryPrefixes[formCountry]} 
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select name="status" defaultValue={editingClient?.status || "Contacté"}>
                  <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contacté">Contacté</SelectItem>
                    <SelectItem value="Injoignable">Injoignable</SelectItem>
                    <SelectItem value="À rappeler">À rappeler</SelectItem>
                    <SelectItem value="Confirmé">Confirmé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Profession</Label>
                <Input name="profession" defaultValue={editingClient?.profession} />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Domaine d'activité</Label>
                <Input name="domain" placeholder="Ex: Informatique, BTP..." defaultValue={editingClient?.domain} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Adresse</Label>
                <Input name="address" defaultValue={editingClient?.address} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Besoins exprimés</Label>
                <Textarea name="needs" defaultValue={editingClient?.needs} rows={4} />
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  {editingClient ? "Mettre à jour" : "Enregistrer le client"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          
          {/* MODALE DE LISTE DES DOCUMENTS */}

        <Dialog open={isDocsDialogOpen} onOpenChange={setIsDocsDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                Documents de {selectedClientForDocs?.first_name} {selectedClientForDocs?.last_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {loadingDocs ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin h-6 w-6" /></div>
              ) : documents.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Aucun document pour ce client.</p>
              ) : (
                <div className="divide-y border rounded-md">
                    {documents.map((doc) => {
                    // Admin, celui qui a uploadé le doc, ou le créateur du client peut supprimer
                    const canDeleteDoc = isAdmin || currentUserId === doc.uploaded_by || currentUserId === selectedClientForDocs?.created_by;

                    return (
                      <div key={doc.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-primary/10 rounded">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate">{doc.file_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              Ajouté le {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewFile(doc.file_path)} title="Visionner">
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* BOUTON SUPPRIMER DOC : Grisé si pas les droits */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={!canDeleteDoc}
                            className={canDeleteDoc ? "text-destructive hover:text-destructive" : "opacity-20 cursor-not-allowed"} 
                            onClick={() => handleDeleteDoc(doc)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setIsDocsDialogOpen(false)}>Fermer</Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* MODALE DÉTAILS DU CLIENT */}
<Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Fiche détaillée : {selectedClientDetails?.first_name} {selectedClientDetails?.last_name}</DialogTitle>
    </DialogHeader>
    
    <div className="grid grid-cols-2 gap-6 py-4">
      <div className="space-y-4">
        <div>
          <Label className="text-muted-foreground">Profession</Label>
          <Input value={selectedClientDetails?.profession || "Non renseigné"} disabled className="bg-muted" />
        </div>
        <div>
          <Label className="text-muted-foreground">Domaine d'activité</Label>
          <Input value={selectedClientDetails?.domain || "Non renseigné"} disabled className="bg-muted" />
        </div>
        <div>
          <Label className="text-muted-foreground">Adresse</Label>
          <Input value={selectedClientDetails?.address || "Non renseigné"} disabled className="bg-muted" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-muted-foreground">Pays</Label>
          <Input value={selectedClientDetails?.country || ""} disabled className="bg-muted" />
        </div>
        <div>
          <Label className="text-muted-foreground">Date d'inscription</Label>
          <Input 
            value={selectedClientDetails ? new Date(selectedClientDetails.created_at).toLocaleDateString() : ""} 
            disabled 
            className="bg-muted" 
          />
        </div>
        <div>
            <Label className="text-secondary-foreground font-semibold text-primary">Créé par</Label>
            <Input 
              value={selectedClientDetails?.profiles 
                ? `${selectedClientDetails.profiles.first_name} ${selectedClientDetails.profiles.last_name}` 
                : "Agent inconnu"} 
              disabled 
              className="bg-primary/5 border-primary/20" 
            />
        </div>
      </div>

      <div className="col-span-2">
        <Label className="text-muted-foreground">Besoins exprimés</Label>
        <Textarea 
          value={selectedClientDetails?.needs || "Aucun besoin spécifique noté."} 
          disabled 
          className="bg-muted min-h-[100px] resize-none" 
        />
      </div>
    </div>

    <div className="flex justify-end border-t pt-4">
      <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Fermer</Button>
    </div>
  </DialogContent>
</Dialog>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
          </div>
        ) : (
          <DataTable columns={columns} data={filteredClients} />
        )}

        <HistoryPanel
          entityType="client"
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title="Historique des clients"
        />
      </div>
    </DashboardLayout>
  );
};

export default Clients;