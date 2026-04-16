import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Column, DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { LeadStatus, StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  Briefcase,
  Clock,
  Eye,
  Globe,
  History,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// --- TYPES ---
type LeadInterest = "Site web" | "Produit" | "Management" | "Événementiel";
type LeadSource = "Appel" | "WhatsApp" | "Email" | "Autre";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  email: string;
  source: LeadSource;
  interest_type: LeadInterest;
  status: LeadStatus;
  responsible_id?: string;
  created_at: string;
  country: string;
  notes?: string;
  lead_exchanges?: any[];
}

const COUNTRY_CONFIG: Record<string, { label: string; placeholder: string }> = {
  france: { label: "France", placeholder: "+33 6 12 34 56 78" },
  senegal: { label: "Sénégal", placeholder: "+221 77 123 45 67" },
  maroc: { label: "Maroc", placeholder: "+212 6 12 34 56 78" },
  cote_ivoire: { label: "Côte d'Ivoire", placeholder: "+225 07 12 34 56 78" },
  belgique: { label: "Belgique", placeholder: "+32 4 12 34 56 78" },
};

const Leads = () => {
  const [currentUserProfile, setCurrentUserProfile] = useState<{id: string, first_name: string, last_name: string} | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Lead>>({
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    phone: "",
    country: "senegal",
    status: "nouveau",
    notes: "",
    source: "Appel"
  });

  const currentUser = "Marie L.";

  const fetchLeads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select(`*, lead_exchanges(*)`)
      .order('created_at', { ascending: false });

    if (error) toast.error("Erreur de chargement des leads");
    else setLeads(data || []);
    setIsLoading(false);
  };

  const fetchGlobalHistory = async () => {
    const { data } = await supabase
      .from('lead_audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    setHistoryLogs(data || []);
  };

  useEffect(() => {
    fetchLeads();
    fetchGlobalHistory();
  }, []);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCurrentUserProfile(profile);
        }
      }
    };
    getUser();
  }, []);

  const handleOpenModal = (lead: Lead | null, edit: boolean = false) => {
    setSelectedLead(lead);
    setIsEditMode(edit);
    
    if (lead) {
      setFormData({ ...lead });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        company_name: "",
        email: "",
        phone: "",
        country: "senegal",
        status: "nouveau",
        notes: "",
        source: "Appel",
        responsible_id: currentUserProfile?.id 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const { lead_exchanges, ...dataToSave } = formData;

      if (selectedLead?.id) {
        const { error } = await supabase
          .from('leads')
          .update(dataToSave)
          .eq('id', selectedLead.id);
        
        if (error) throw error;
        toast.success("Lead mis à jour");
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([dataToSave]);
        
        if (error) throw error;
        toast.success("Lead créé avec succès");
      }

      setIsModalOpen(false);
      fetchLeads();
    } catch (error: any) {
      console.error("Erreur complète:", error);
      toast.error("Erreur lors de l'enregistrement : " + error.message);
    }
  };

  const handleConvert = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return toast.error("Lead introuvable");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Session expirée, veuillez vous reconnecter");

    // Créer un projet depuis les infos du lead
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { error: projectError } = await supabase.from("projects").insert([{
      name: `Projet - ${lead.first_name} ${lead.last_name}`,
      client_name: lead.company_name || `${lead.first_name} ${lead.last_name}`,
      status: "en_cours",
      progress: 0,
      deadline,
      country: lead.country || "senegal",
      description: lead.notes || "",
      created_by: user.id,
    }]);

    if (projectError) {
      toast.error("Erreur lors de la création du projet : " + projectError.message);
      return;
    }

    // Marquer le lead comme converti
    const { error: leadError } = await supabase
      .from("leads")
      .update({ status: "converti" })
      .eq("id", leadId);

    if (leadError) {
      toast.error("Projet créé mais impossible de mettre à jour le lead");
    } else {
      toast.success("Lead converti en projet avec succès !");
      fetchLeads();
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const searchString = `${lead.first_name} ${lead.last_name} ${lead.company_name}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase()) &&
      (selectedStatus === "all" || lead.status === selectedStatus) &&
      (selectedCountry === "all" || lead.country === selectedCountry);
  });

  const filteredHistory = historyLogs.filter(log =>
    log.lead_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
    log.action?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const columns: Column<Lead>[] = [
    {
      key: "name",
      header: "Lead / Société",
      render: (lead) => (
        <div>
          <p className="font-medium text-foreground text-xs sm:text-sm">{lead.first_name} {lead.last_name}</p>
          <p className="text-xs text-muted-foreground italic">{lead.company_name}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Coordonnées",
      render: (lead) => (
        <div className="space-y-0.5">
          <p className="text-xs sm:text-sm flex items-center gap-2"><Mail className="w-3 h-3" /> {lead.email}</p>
          <p className="text-xs sm:text-sm flex items-center gap-2"><Phone className="w-3 h-3" /> {lead.phone}</p>
        </div>
      ),
    },
    { key: "source", header: "Source", render: (lead) => <span className="text-xs sm:text-sm">{lead.source}</span> },
    { key: "status", header: "Statut", render: (lead) => <StatusBadge status={lead.status} /> },
    {
      key: "actions",
      header: "",
      render: (lead) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleOpenModal(lead, false)}>
              <Eye className="w-4 h-4 mr-2" /> Détails
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenModal(lead, true)}>
              <Pencil className="w-4 h-4 mr-2" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Conversion</DropdownMenuLabel>
            <DropdownMenuItem className="text-primary font-bold text-xs" onClick={() => handleConvert(lead.id)}>
              <Briefcase className="w-4 h-4 mr-2" /> Convertir
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive text-xs"><Trash2 className="w-4 h-4 mr-2" /> Abandonner</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER - Responsive */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Prospection</h1>
            <p className="text-xs sm:text-base text-muted-foreground">Gestion des prospects</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="gap-2 text-xs sm:text-sm w-full sm:w-auto order-2 sm:order-1">
              <History className="w-4 h-4" /> <span className="hidden sm:inline">Historique</span><span className="sm:hidden">Hist.</span>
            </Button>
            <Button onClick={() => handleOpenModal(null, true)} className="gap-2 bg-primary hover:bg-primary/90 text-xs sm:text-sm w-full sm:w-auto order-1 sm:order-2">
              <Plus className="w-4 h-4" /> Nouveau lead
            </Button>
          </div>
        </div>

        {/* BARRE DE FILTRES */}
        <FilterBar
          searchPlaceholder="Rechercher..."
          onSearchChange={setSearchQuery}
          onCountryChange={setSelectedCountry}
          selectedCountry={selectedCountry}
          additionalFilters={
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full lg:w-40 h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="nouveau">Nouveau</SelectItem>
                <SelectItem value="contacte">Contacté</SelectItem>
                <SelectItem value="interesse">Intéressé</SelectItem>
                <SelectItem value="non_interesse">Non intéressé</SelectItem>
                <SelectItem value="converti">Converti</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* TABLEAU */}
        <DataTable columns={columns} data={filteredLeads} emptyMessage="Aucun prospect trouvé." />

        {/* MODAL : NOUVEAU / DÉTAILS / MODIFIER - Responsive */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
                {selectedLead ? <UserCheck className="w-5 h-5 text-teal-600" /> : <Plus className="w-5 h-5 text-teal-600" />}
                <span className="truncate">{selectedLead ? `${formData.first_name} ${formData.last_name}` : "Nouveau Lead"}</span>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="infos" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 mb-4 text-xs sm:text-sm">
                <TabsTrigger value="infos">Infos</TabsTrigger>
                <TabsTrigger value="exchanges" className="flex gap-1">
                  <MessageSquare className="w-3 h-3" /> 
                  <span className="hidden sm:inline">Échanges</span>
                  <span className="sm:hidden">Ech.</span>
                  ({selectedLead?.lead_exchanges?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="infos" className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Prénom</Label>
                    <Input 
                      value={formData.first_name || ""} 
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      disabled={!isEditMode} 
                      placeholder="Prénom" 
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Nom</Label>
                    <Input 
                      value={formData.last_name || ""} 
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      disabled={!isEditMode} 
                      placeholder="Nom" 
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Société</Label>
                    <Input 
                      value={formData.company_name || ""} 
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      disabled={!isEditMode} 
                      placeholder="Entreprise" 
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Pays</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={(v) => setFormData({...formData, country: v})} 
                      disabled={!isEditMode}
                    >
                      <SelectTrigger className="h-9 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COUNTRY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs sm:text-sm">{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Téléphone</Label>
                    <Input 
                      value={formData.phone || ""} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!isEditMode} 
                      placeholder={COUNTRY_CONFIG[formData.country || 'france']?.placeholder} 
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Email</Label>
                    <Input 
                      value={formData.email || ""} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditMode} 
                      placeholder="email@exemple.com" 
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="font-bold text-teal-600 text-xs sm:text-sm">Statut</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData({...formData, status: v as LeadStatus})} 
                      disabled={!isEditMode}
                    >
                      <SelectTrigger className="h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="contacte">Contacté</SelectItem>
                        <SelectItem value="interesse">Intéressé</SelectItem>
                        <SelectItem value="non_interesse">Non intéressé</SelectItem>
                        <SelectItem value="converti">Converti</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Commercial</Label>
                    <div className="relative">
                      <Input 
                        value={currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : "Chargement..."} 
                        disabled 
                        className="bg-slate-50 pl-9 h-9 text-xs sm:text-sm"
                      />
                      <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs sm:text-sm">Notes (Besoins)</Label>
                  <Textarea 
                    value={formData.notes || ""} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    disabled={!isEditMode} 
                    className="min-h-[80px] text-xs sm:text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="exchanges" className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 text-left font-semibold">Date</th>
                          <th className="px-3 sm:px-4 py-2 text-left font-semibold">Type</th>
                          <th className="px-3 sm:px-4 py-2 text-left font-semibold hidden sm:table-cell">Commentaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedLead?.lead_exchanges && selectedLead.lead_exchanges.length > 0 ? (
                          selectedLead.lead_exchanges.map((ex: any) => (
                            <tr key={ex.id} className="hover:bg-slate-50/50">
                              <td className="px-3 sm:px-4 py-2 text-slate-600 text-[11px] sm:text-sm">
                                {new Date(ex.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-3 sm:px-4 py-2">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] sm:text-[10px] font-bold uppercase">{ex.type}</span>
                              </td>
                              <td className="px-3 sm:px-4 py-2 text-slate-700 hidden sm:table-cell text-xs">{ex.comment}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-3 sm:px-4 py-6 text-center text-muted-foreground italic text-xs">
                              Aucun échange.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {isEditMode && selectedLead && (
                  <Button variant="outline" size="sm" className="w-full border-dashed gap-2 text-xs sm:text-sm">
                    <Plus className="w-4 h-4" /> Ajouter un échange
                  </Button>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 border-t pt-4 flex-col-reverse sm:flex-row">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs sm:text-sm w-full sm:w-auto">
                {isEditMode ? "Annuler" : "Fermer"}
              </Button>
              {isEditMode && (
                <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm w-full sm:w-auto">
                  Enregistrer
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SHEET : HISTORIQUE GLOBAL - Responsive */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent className="w-[95vw] sm:max-w-md flex flex-col h-full p-4 sm:p-6">
            <SheetHeader className="border-b pb-4">
              <SheetTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
                <History className="w-5 h-5 text-teal-600" /> Historique
              </SheetTitle>
              <div className="relative mt-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Rechercher..."
                  className="w-full pl-8 pr-4 py-2 border rounded-md text-xs sm:text-sm"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
              {filteredHistory.map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 py-1">
                  <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-white border-2 border-teal-500" />
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium gap-2">
                      <span className="line-clamp-1"><Clock className="w-3 h-3 inline mr-1" />{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded uppercase shrink-0 text-[9px]">{log.type}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">{log.lead_name}</p>
                    <p className="text-xs sm:text-sm text-slate-600 italic">"{log.action}"</p>
                    <p className="text-[10px] text-teal-600 font-medium">Par {log.user_name || 'Système'}</p>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default Leads;
