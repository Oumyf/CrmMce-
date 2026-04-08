import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  FileText,
  Wallet,
  File,
  X,
  Download,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface EmployeeDocument {
  id: string;
  type: string;
  file_name: string;
  uploaded_date: string;
  url?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  country: string;
  photo?: string;
  hire_date?: string;
  contract_type?: string;
  salary?: number;
  notes?: string;
  job_description_file?: string;
  contract_file?: string;
  cv_file?: string;
  documents?: EmployeeDocument[];
  salary_slips?: string[];
  status?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

interface ProfileOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  country: string | null;
  avatar_url: string | null;
}

// ─── Données statiques ────────────────────────────────────────────────────────

const countries = [
  "Sénégal",
  "Côte d'Ivoire",
  "Mali",
  "Burkina Faso",
  "Guinée",
  "Bénin",
  "Togo",
  "Niger",
  "Cameroun",
  "Congo",
  "RDC",
  "Gabon",
  "Mauritanie",
  "France",
  "Autre",
];

const departments = ["Design", "Tech", "Marketing", "Ventes", "RH", "Finance"];
const contractTypes = ["CDI", "CDD", "Stage", "Freelance"];

// ─── Helper : formater une date ISO en DD/MM/YYYY ─────────────────────────────
const formatDate = (raw: string | null | undefined): string => {
  if (!raw) return "-";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ─── Helper : générer un ID unique sans crypto.randomUUID ────────────────────
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ─── Composant principal ──────────────────────────────────────────────────────

const Recruitment = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [fileConfirm, setFileConfirm] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

  const confirmAction = (title: string, description: string, onConfirm: () => void) => {
    setFileConfirm({ open: true, title, description, onConfirm });
  };
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const [formData, setFormData] = useState<Partial<Employee>>({
    first_name: "",
    last_name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    country: "",
    hire_date: "",
    contract_type: "",
    salary: 0,
    notes: "",
    photo: "",
    job_description_file: "",
    status: "active",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
  });

  // ── Charger les salariés depuis Supabase ───────────────────────────────────
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      const [employeesRes, profilesRes] = await Promise.all([
        supabase
          .from("recruited_employees")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .order("first_name", { ascending: true }),
      ]);

      if (employeesRes.error) {
        toast.error("Erreur lors du chargement des salariés : " + employeesRes.error.message);
      } else {
        // Normaliser documents et salary_slips qui peuvent être null en base
        const normalized = (employeesRes.data || []).map((emp) => ({
          ...emp,
          documents: Array.isArray(emp.documents) ? emp.documents : [],
          salary_slips: Array.isArray(emp.salary_slips) ? emp.salary_slips : [],
        }));
        setEmployees(normalized);
      }

      if (profilesRes.error) {
        toast.error("Erreur lors du chargement des profils : " + profilesRes.error.message);
      } else {
        const mappedProfiles: ProfileOption[] = (profilesRes.data || []).map((p: any) => ({
          id: p.id,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          email: p.email ?? p.user_email ?? p.email_address ?? null,
          phone: p.phone ?? null,
          role: p.role ?? null,
          country: p.country ?? p.pays ?? null,
          avatar_url: p.avatar_url ?? null,
        }));
        setProfiles(mappedProfiles);
      }

      setLoading(false);
    };
    fetchEmployees();
  }, []);

  // ── Filtre texte ───────────────────────────────────────────────────────────
  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ── Ouvrir le dialog pour un nouveau salarié ───────────────────────────────
  const handleOpenNewDialog = () => {
    setEditingEmployee(null);
    setSelectedProfileId("");
    setFormData({
      first_name: "",
      last_name: "",
      role: "",
      email: "",
      phone: "",
      department: "",
      country: "",
      hire_date: "",
      contract_type: "",
      salary: 0,
      notes: "",
      photo: "",
      job_description_file: "",
      status: "active",
      address: "",
      emergency_contact: "",
      emergency_phone: "",
    });
    setPhotoPreview("");
    setShowNewEmployeeDialog(true);
  };

  // ── Ouvrir le dialog pour modifier ────────────────────────────────────────
  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setSelectedProfileId("");
    setFormData(emp);
    setPhotoPreview(emp.photo || "");
    setShowNewEmployeeDialog(true);
  };

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (!profileId || profileId === "manual") return;

    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    setFormData((prev) => ({
      ...prev,
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      role: profile.role || "",
      country: profile.country || "",
      photo: profile.avatar_url || "",
    }));
    setPhotoPreview(profile.avatar_url || "");
  };

  // ── Upload photo (base64) ──────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData((prev) => ({ ...prev, photo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Sauvegarder (créer ou modifier) ───────────────────────────────────────
  const handleSaveEmployee = async () => {
    if (
      !formData.first_name ||
      !formData.last_name ||
      !formData.email ||
      !formData.department ||
      !formData.country
    ) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (editingEmployee) {
      // UPDATE
      const { error } = await supabase
        .from("recruited_employees")
        .update(formData)
        .eq("id", editingEmployee.id);
      if (error) {
        toast.error("Erreur lors de la mise à jour : " + error.message);
        return;
      }
      const { data } = await supabase
        .from("recruited_employees")
        .select("*")
        .order("created_at", { ascending: false });
      const normalized = (data || []).map((emp) => ({
        ...emp,
        documents: Array.isArray(emp.documents) ? emp.documents : [],
        salary_slips: Array.isArray(emp.salary_slips) ? emp.salary_slips : [],
      }));
      setEmployees(normalized);
      setSelectedEmployee(normalized.find((e) => e.id === editingEmployee.id) || null);
      toast.success("Salarié mis à jour avec succès");
    } else {
      // CREATE
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const insertData = {
        ...formData,
        photo:
          formData.photo ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.first_name}`,
        documents: [],
        salary_slips: [],
        created_at: new Date().toISOString(),
        created_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from("recruited_employees")
        .insert([insertData])
        .select();
      if (error) {
        toast.error("Erreur lors de l'ajout : " + error.message);
        return;
      }
      const newEmp = { ...(data?.[0] || {}), documents: [], salary_slips: [] };
      setEmployees([newEmp, ...employees]);
      toast.success("Salarié ajouté avec succès");
    }
    setShowNewEmployeeDialog(false);
  };

  // ── Supprimer ──────────────────────────────────────────────────────────────
  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase
      .from("recruited_employees")
      .delete()
      .eq("id", deleteTargetId);
    if (error) {
      toast.error("Erreur lors de la suppression : " + error.message);
      return;
    }
    setEmployees(employees.filter((emp) => emp.id !== deleteTargetId));
    if (selectedEmployee?.id === deleteTargetId) setSelectedEmployee(null);
    toast.success("Salarié supprimé avec succès");
    setShowDeleteDialog(false);
    setDeleteTargetId(null);
  };

  // ── Helper : upload vers Supabase Storage ────────────────────────────────
  const uploadToStorage = async (bucket: string, employeeId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${employeeId}/${generateId()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast.error("Erreur upload : " + error.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Helper : sync employé en base et state ────────────────────────────────
  const syncEmployee = async (employeeId: string, patch: Partial<Employee>) => {
    const { error } = await supabase.from("recruited_employees").update(patch).eq("id", employeeId);
    if (error) { toast.error("Erreur sauvegarde : " + error.message); return false; }
    const updated = employees.map((e) => e.id === employeeId ? { ...e, ...patch } : e);
    setEmployees(updated);
    setSelectedEmployee(updated.find((e) => e.id === employeeId) || null);
    return true;
  };

  // ── Helper : parser un entry JSON ou string brut ───────────────────────────
  const parseFileEntry = (entry: string): { name: string; url: string } => {
    try { return JSON.parse(entry); } catch { return { name: entry, url: "" }; }
  };

  // ── Documents ──────────────────────────────────────────────────────────────
  const handleAddDocument = async (employeeId: string, file: File) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    toast.loading("Upload en cours...", { id: "upload" });
    const url = await uploadToStorage("employee-documents", employeeId, file);
    toast.dismiss("upload");
    if (!url) return;
    const newDoc: EmployeeDocument = {
      id: generateId(), type: "document", file_name: file.name,
      uploaded_date: new Date().toLocaleDateString("fr-FR"), url,
    };
    const updatedDocs = [...(emp.documents || []), newDoc];
    const ok = await syncEmployee(employeeId, { documents: updatedDocs });
    if (ok) toast.success("Document ajouté");
  };

  const handleDeleteDocument = async (employeeId: string, docId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const updatedDocs = emp.documents?.filter((d) => d.id !== docId) || [];
    const ok = await syncEmployee(employeeId, { documents: updatedDocs });
    if (ok) toast.success("Document supprimé");
  };

  // ── Fiches de paie ─────────────────────────────────────────────────────────
  const handleAddSalarySlip = async (employeeId: string, file: File) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    toast.loading("Upload en cours...", { id: "upload" });
    const url = await uploadToStorage("employee-salary-slips", employeeId, file);
    toast.dismiss("upload");
    if (!url) return;
    const slipEntry = JSON.stringify({ name: file.name, url });
    const updatedSlips = [...(emp.salary_slips || []), slipEntry];
    const ok = await syncEmployee(employeeId, { salary_slips: updatedSlips });
    if (ok) toast.success("Fiche de paie ajoutée");
  };

  const handleDeleteSalarySlip = async (employeeId: string, index: number) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const updatedSlips = emp.salary_slips?.filter((_, i) => i !== index) || [];
    const ok = await syncEmployee(employeeId, { salary_slips: updatedSlips });
    if (ok) toast.success("Fiche de paie supprimée");
  };

  // ── Contrat ────────────────────────────────────────────────────────────────
  const handleAddContract = async (employeeId: string, file: File) => {
    toast.loading("Upload en cours...", { id: "upload" });
    const url = await uploadToStorage("employee-contracts", employeeId, file);
    toast.dismiss("upload");
    if (!url) return;
    const ok = await syncEmployee(employeeId, { contract_file: JSON.stringify({ name: file.name, url }) });
    if (ok) toast.success("Contrat ajouté");
  };

  // ── CV ─────────────────────────────────────────────────────────────────────
  const handleAddCV = async (employeeId: string, file: File) => {
    toast.loading("Upload en cours...", { id: "upload" });
    const url = await uploadToStorage("employee-cvs", employeeId, file);
    toast.dismiss("upload");
    if (!url) return;
    const ok = await syncEmployee(employeeId, { cv_file: JSON.stringify({ name: file.name, url }) });
    if (ok) toast.success("CV ajouté");
  };

  // ── Téléchargement ─────────────────────────────────────────────────────────
  const handleDownloadDocument = (fileNameOrJson: string) => {
    try {
      const parsed = JSON.parse(fileNameOrJson);
      const a = document.createElement("a");
      a.href = parsed.url;
      a.download = parsed.name;
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Fichier non disponible (uploadé avant la mise à jour)");
    }
  };


  // ── Ajouter/Remplacer fiche de poste ──────────────────────────────────────
  const handleAddJobDescription = async (employeeId: string, file: File) => {
    toast.loading("Upload en cours...", { id: "upload" });
    const url = await uploadToStorage("employee-documents", employeeId, file);
    toast.dismiss("upload");
    if (!url) return;
    const ok = await syncEmployee(employeeId, { job_description_file: JSON.stringify({ name: file.name, url }) });
    if (ok) toast.success("Fiche de poste ajoutée");
  };

  // ── Supprimer contrat ─────────────────────────────────────────────────────
  const handleDeleteContract = (employeeId: string) => {
    confirmAction("Supprimer le contrat ?", "Cette action est irréversible.", async () => {
      const ok = await syncEmployee(employeeId, { contract_file: null });
      if (ok) toast.success("Contrat supprimé");
      setFileConfirm(f => ({ ...f, open: false }));
    });
  };

  // ── Supprimer CV ──────────────────────────────────────────────────────────
  const handleDeleteCV = (employeeId: string) => {
    confirmAction("Supprimer le CV ?", "Cette action est irréversible.", async () => {
      const ok = await syncEmployee(employeeId, { cv_file: null });
      if (ok) toast.success("CV supprimé");
      setFileConfirm(f => ({ ...f, open: false }));
    });
  };

  // ── Supprimer fiche de poste ──────────────────────────────────────────────
  const handleDeleteJobDescription = (employeeId: string) => {
    confirmAction("Supprimer la fiche de poste ?", "Cette action est irréversible.", async () => {
      const ok = await syncEmployee(employeeId, { job_description_file: null });
      if (ok) toast.success("Fiche de poste supprimée");
      setFileConfirm(f => ({ ...f, open: false }));
    });
  };

  // ── Supprimer document avec confirm ───────────────────────────────────────
  const handleDeleteDocumentConfirm = (employeeId: string, docId: string, docName: string) => {
    confirmAction(`Supprimer "${docName}" ?`, "Ce document sera définitivement supprimé.", async () => {
      await handleDeleteDocument(employeeId, docId);
      setFileConfirm(f => ({ ...f, open: false }));
    });
  };

  // ── Supprimer fiche de paie avec confirm ──────────────────────────────────
  const handleDeleteSalarySlipConfirm = (employeeId: string, idx: number, slipName: string) => {
    confirmAction(`Supprimer "${slipName}" ?`, "Cette fiche sera définitivement supprimée.", async () => {
      await handleDeleteSalarySlip(employeeId, idx);
      setFileConfirm(f => ({ ...f, open: false }));
    });
  };

  const isProfileSelected = !editingEmployee && !!selectedProfileId && selectedProfileId !== "manual";

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestion du Recrutement</h1>
            <p className="text-muted-foreground">
              Gérez les salariés et le recrutement de l'agence ({employees.length} salarié
              {employees.length > 1 ? "s" : ""})
            </p>
          </div>

          <Dialog open={showNewEmployeeDialog} onOpenChange={setShowNewEmployeeDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={handleOpenNewDialog}>
                <Plus className="w-4 h-4" />
                Ajouter un salarié
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Modifier le salarié" : "Ajouter un nouveau salarié"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {!editingEmployee && (
                  <div>
                    <Label>Sélectionner un utilisateur existant</Label>
                    <Select value={selectedProfileId} onValueChange={handleSelectProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un profil (ou saisie manuelle)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Saisie manuelle</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "Utilisateur"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* PHOTO UPLOAD */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={photoPreview} />
                    <AvatarFallback>
                      {formData.first_name?.charAt(0)}
                      {formData.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="w-4 h-4" />
                    <label className="cursor-pointer">
                      Importer une photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </Button>
                </div>

                {/* INFORMATIONS PERSONNELLES */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom *</Label>
                    <Input
                      placeholder="Prénom"
                      value={formData.first_name || ""}
                      readOnly={isProfileSelected}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      placeholder="Nom"
                      value={formData.last_name || ""}
                      readOnly={isProfileSelected}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="email@agence.com"
                      value={formData.email || ""}
                      readOnly={isProfileSelected}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      placeholder="+221771234567"
                      value={formData.phone || ""}
                      readOnly={isProfileSelected}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Poste</Label>
                    <Input
                      placeholder="Ex: Développeur"
                      value={formData.role || ""}
                      readOnly={isProfileSelected}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Pays *</Label>
                    <Select
                      value={formData.country || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, country: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Département *</Label>
                    <Select
                      value={formData.department || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, department: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un département" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type de contrat</Label>
                    <Select
                      value={formData.contract_type || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, contract_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {contractTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date d'embauche</Label>
                    <Input
                      type="date"
                      value={formData.hire_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, hire_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Salaire (CFA)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.salary || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salary: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                {/* FICHE DE POSTE */}
                <div>
                  <Label>Fiche de poste (PDF, Word...)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.odt,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, job_description_file: file.name });
                        toast.success("Fichier sélectionné : " + file.name);
                      }
                    }}
                  />
                  {formData.job_description_file && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Fichier : {formData.job_description_file}
                    </p>
                  )}
                </div>

                {/* ADRESSE */}
                <div>
                  <Label>Adresse</Label>
                  <Input
                    placeholder="Adresse du salarié"
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                {/* CONTACT D'URGENCE */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact d'urgence</Label>
                    <Input
                      placeholder="Nom du contact"
                      value={formData.emergency_contact || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_contact: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Téléphone d'urgence</Label>
                    <Input
                      placeholder="+221..."
                      value={formData.emergency_phone || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, emergency_phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* STATUT */}
                <div>
                  <Label>Statut</Label>
                  <Select
                    value={formData.status || "active"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="on_leave">En congé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NOTES */}
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Notes internes..."
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowNewEmployeeDialog(false)}
                >
                  Annuler
                </Button>
                <Button onClick={handleSaveEmployee}>
                  {editingEmployee ? "Mettre à jour" : "Ajouter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* TABLEAU DES SALARIÉS */}
          <div className="col-span-full">
            {/* BARRE DE RECHERCHE */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, poste..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Aucun salarié trouvé
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Photo</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Poste</TableHead>
                      <TableHead>Département</TableHead>
                      <TableHead>Pays</TableHead>
                      <TableHead>Contrat</TableHead>
                      <TableHead>Salaire</TableHead>
                      <TableHead>Embauche</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        <TableCell>
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={emp.photo} />
                            <AvatarFallback>
                              {emp.first_name.charAt(0)}
                              {emp.last_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                          {emp.first_name} {emp.last_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {emp.email}
                        </TableCell>
                        <TableCell className="text-sm">{emp.phone}</TableCell>
                        <TableCell className="text-sm">{emp.role}</TableCell>
                        <TableCell className="text-sm">{emp.department}</TableCell>
                        <TableCell className="text-sm">{emp.country}</TableCell>
                        <TableCell className="text-sm">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                            {emp.contract_type || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {emp.salary ? emp.salary.toLocaleString("fr-FR") : "-"} CFA
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(emp.hire_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span
                            className={
                              emp.status === "active"
                                ? "bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium"
                                : emp.status === "on_leave"
                                ? "bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium"
                                : "bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-medium"
                            }
                          >
                            {emp.status === "active"
                              ? "Actif"
                              : emp.status === "on_leave"
                              ? "En congé"
                              : emp.status === "inactive"
                              ? "Inactif"
                              : emp.status || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEmployee(emp);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(emp.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* FICHE DÉTAILLÉE */}
          {selectedEmployee && (
            <div className="col-span-full border-t pt-6">
              <div className="bg-white border rounded-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-start">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={selectedEmployee.photo} />
                      <AvatarFallback>
                        {selectedEmployee.first_name.charAt(0)}
                        {selectedEmployee.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {selectedEmployee.role}
                      </p>
                      <span
                        className={
                          selectedEmployee.status === "active"
                            ? "mt-1 inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium"
                            : selectedEmployee.status === "on_leave"
                            ? "mt-1 inline-block bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium"
                            : "mt-1 inline-block bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium"
                        }
                      >
                        {selectedEmployee.status === "active"
                          ? "Actif"
                          : selectedEmployee.status === "on_leave"
                          ? "En congé"
                          : "Inactif"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEmployee(selectedEmployee)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedEmployee(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="info">
                  <TabsList className="flex-wrap">
                    <TabsTrigger value="info">Informations</TabsTrigger>
                    <TabsTrigger value="fiche">Fiche de poste</TabsTrigger>
                    <TabsTrigger value="documents">
                      Documents ({selectedEmployee.documents?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="salary">
                      Fiches de paie ({selectedEmployee.salary_slips?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="contract">Contrat</TabsTrigger>
                    <TabsTrigger value="cv">CV</TabsTrigger>
                  </TabsList>

                  {/* INFORMATIONS */}
                  <TabsContent value="info" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                        <p className="mt-1">{selectedEmployee.email}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Téléphone</p>
                        <p className="mt-1">{selectedEmployee.phone || "-"}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Poste</p>
                        <p className="mt-1">{selectedEmployee.role || "-"}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Département</p>
                        <p className="mt-1">{selectedEmployee.department}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Pays</p>
                        <p className="mt-1">{selectedEmployee.country}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Type de contrat</p>
                        <p className="mt-1">{selectedEmployee.contract_type || "-"}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Date d'embauche</p>
                        <p className="mt-1">{formatDate(selectedEmployee.hire_date)}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Salaire</p>
                        <p className="mt-1 font-semibold">
                          {selectedEmployee.salary?.toLocaleString("fr-FR") || "-"} CFA
                        </p>
                      </div>
                      {selectedEmployee.address && (
                        <div className="border p-4 rounded col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Adresse</p>
                          <p className="mt-1">{selectedEmployee.address}</p>
                        </div>
                      )}
                      {selectedEmployee.emergency_contact && (
                        <div className="border p-4 rounded">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Contact d'urgence</p>
                          <p className="mt-1">{selectedEmployee.emergency_contact}</p>
                        </div>
                      )}
                      {selectedEmployee.emergency_phone && (
                        <div className="border p-4 rounded">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Tél. urgence</p>
                          <p className="mt-1">{selectedEmployee.emergency_phone}</p>
                        </div>
                      )}
                      {selectedEmployee.notes && (
                        <div className="border p-4 rounded col-span-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Notes</p>
                          <p className="mt-1 text-sm text-muted-foreground">{selectedEmployee.notes}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* FICHE DE POSTE */}
                  <TabsContent value="fiche" className="space-y-4 mt-4">
                    {selectedEmployee.job_description_file ? (
                      <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
                        <FileText className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {parseFileEntry(selectedEmployee.job_description_file).name}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => handleDownloadDocument(selectedEmployee.job_description_file!)}>
                            <Download className="w-4 h-4" /> Télécharger
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 relative">
                            <RefreshCw className="w-4 h-4" /> Remplacer
                            <input type="file" accept=".pdf,.doc,.docx,.odt,.txt"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddJobDescription(selectedEmployee.id, f); }} />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteJobDescription(selectedEmployee.id)}>
                            <Trash2 className="w-4 h-4" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="gap-2 relative">
                        <FileText className="w-4 h-4" /> Ajouter une fiche de poste
                        <input type="file" accept=".pdf,.doc,.docx,.odt,.txt"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddJobDescription(selectedEmployee.id, f); }} />
                      </Button>
                    )}
                  </TabsContent>

                  {/* DOCUMENTS */}
                  <TabsContent value="documents" className="mt-4 space-y-3">
                    <Button variant="outline" className="gap-2 relative">
                      <FileText className="w-4 h-4" /> Ajouter un document
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddDocument(selectedEmployee.id, f); }} />
                    </Button>
                    {selectedEmployee.documents && selectedEmployee.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEmployee.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition group">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">{doc.uploaded_date}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                onClick={() => handleDownloadDocument(doc.url || doc.file_name)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDocumentConfirm(selectedEmployee.id, doc.id, doc.file_name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucun document pour le moment</p>
                    )}
                  </TabsContent>

                  {/* FICHES DE PAIE */}
                  <TabsContent value="salary" className="mt-4 space-y-3">
                    <Button variant="outline" className="gap-2 relative">
                      <Wallet className="w-4 h-4" /> Ajouter une fiche de paie
                      <input type="file" accept=".pdf,.doc,.docx"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddSalarySlip(selectedEmployee.id, f); }} />
                    </Button>
                    {selectedEmployee.salary_slips && selectedEmployee.salary_slips.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEmployee.salary_slips.map((slip, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition">
                            <Wallet className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{parseFileEntry(slip).name}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                                onClick={() => handleDownloadDocument(slip)}>
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteSalarySlipConfirm(selectedEmployee.id, idx, parseFileEntry(slip).name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucune fiche de paie</p>
                    )}
                  </TabsContent>

                  {/* CONTRAT */}
                  <TabsContent value="contract" className="mt-4 space-y-3">
                    {selectedEmployee.contract_file ? (
                      <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
                        <File className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {parseFileEntry(selectedEmployee.contract_file).name}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => handleDownloadDocument(selectedEmployee.contract_file!)}>
                            <Download className="w-4 h-4" /> Télécharger
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 relative">
                            <RefreshCw className="w-4 h-4" /> Remplacer
                            <input type="file" accept=".pdf,.doc,.docx"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddContract(selectedEmployee.id, f); }} />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteContract(selectedEmployee.id)}>
                            <Trash2 className="w-4 h-4" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="gap-2 relative">
                        <File className="w-4 h-4" /> Ajouter un contrat
                        <input type="file" accept=".pdf,.doc,.docx"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddContract(selectedEmployee.id, f); }} />
                      </Button>
                    )}
                  </TabsContent>

                  {/* CV */}
                  <TabsContent value="cv" className="mt-4 space-y-3">
                    {selectedEmployee.cv_file ? (
                      <div className="flex items-center gap-3 p-4 border rounded-lg bg-slate-50">
                        <File className="w-5 h-5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {parseFileEntry(selectedEmployee.cv_file).name}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => handleDownloadDocument(selectedEmployee.cv_file!)}>
                            <Download className="w-4 h-4" /> Télécharger
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 relative">
                            <RefreshCw className="w-4 h-4" /> Remplacer
                            <input type="file" accept=".pdf,.doc,.docx"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddCV(selectedEmployee.id, f); }} />
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCV(selectedEmployee.id)}>
                            <Trash2 className="w-4 h-4" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="gap-2 relative">
                        <File className="w-4 h-4" /> Ajouter un CV
                        <input type="file" accept=".pdf,.doc,.docx"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddCV(selectedEmployee.id, f); }} />
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG CONFIRMATION FICHIER */}
      <AlertDialog open={fileConfirm.open} onOpenChange={(open) => setFileConfirm(f => ({ ...f, open }))}>
        <AlertDialogContent>
          <AlertDialogTitle>{fileConfirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{fileConfirm.description}</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={fileConfirm.onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE SUPPRESSION */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer ce salarié ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le salarié sera définitivement supprimé
            du système.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Recruitment;