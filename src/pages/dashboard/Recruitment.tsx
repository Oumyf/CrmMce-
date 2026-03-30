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
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EmployeeDocument {
  id: string;
  type: string;
  file_name: string;
  uploaded_date: string;
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
  job_description_file?: string; // chemin ou nom du fichier uploadé
  contract_file?: string;
  cv_file?: string;
  documents?: EmployeeDocument[];
  salary_slips?: string[];
}

const mockEmployees: Employee[] = [
  {
    id: "1",
    first_name: "Marie",
    last_name: "Lopez",
    role: "Graphiste",
    email: "marie@agence.com",
    phone: "+221771234567",
    department: "Design",
    country: "Sénégal",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie",
    hire_date: "2024-01-15",
    contract_type: "CDI",
    salary: 450000,
    job_description_file: "",
    documents: [],
    salary_slips: [],
  },
  {
    id: "2",
    first_name: "Paul",
    last_name: "Martin",
    role: "Développeur",
    email: "paul@agence.com",
    phone: "+221771234568",
    department: "Tech",
    country: "Côte d'Ivoire",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paul",
    hire_date: "2023-06-20",
    contract_type: "CDI",
    salary: 550000,
    job_description_file: "",
    documents: [],
    salary_slips: [],
  },
  {
    id: "3",
    first_name: "Aminata",
    last_name: "Diallo",
    role: "Community Manager",
    email: "aminata@agence.com",
    phone: "+221771234569",
    department: "Marketing",
    country: "Sénégal",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aminata",
    hire_date: "2024-03-10",
    contract_type: "CDD",
    salary: 350000,
    job_description_file: "",
    documents: [],
    salary_slips: [],
  },
];

const countries = [
  "Sénégal",
  "Côte d'Ivoire",
  "Mali",
  "Burkina Faso",
  "Guinea",
  "Benin",
  "Togo",
  "Niger",
  "Cameroun",
  "Congo",
];

const departments = ["Design", "Tech", "Marketing", "Ventes", "RH", "Finance"];
const contractTypes = ["CDI", "CDD", "Stage", "Freelance"];

const Recruitment = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
    // Charger les salariés depuis Supabase au montage
    useEffect(() => {
      const fetchEmployees = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("recruitment").select("*").order("created_at", { ascending: false });
        if (error) {
          toast.error("Erreur lors du chargement des salariés : " + error.message);
        } else {
          setEmployees(data || []);
        }
        setLoading(false);
      };
      fetchEmployees();
    }, []);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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
  });

  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleOpenNewDialog = () => {
    setEditingEmployee(null);
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
      job_description: "",
    });
    setPhotoPreview("");
    setShowNewEmployeeDialog(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData(emp);
    setPhotoPreview(emp.photo || "");
    setShowNewEmployeeDialog(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData({ ...formData, photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

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
        .from("recruitment")
        .update(formData)
        .eq("id", editingEmployee.id);
      if (error) {
        toast.error("Erreur lors de la mise à jour : " + error.message);
        return;
      }
      // Recharger la liste
      const { data } = await supabase.from("recruitment").select("*").order("created_at", { ascending: false });
      setEmployees(data || []);
      setSelectedEmployee(data?.find(e => e.id === editingEmployee.id) || null);
      toast.success("Salarié mis à jour avec succès");
    } else {
      // CREATE
      const insertData = {
        ...formData,
        photo: formData.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.first_name}`,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("recruitment").insert([insertData]).select();
      if (error) {
        toast.error("Erreur lors de l'ajout : " + error.message);
        return;
      }
      setEmployees([...(data || []), ...employees]);
      toast.success("Salarié ajouté avec succès");
    }
    setShowNewEmployeeDialog(false);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      const { error } = await supabase.from("recruitment").delete().eq("id", deleteTargetId);
      if (error) {
        toast.error("Erreur lors de la suppression : " + error.message);
        return;
      }
      setEmployees(employees.filter((emp) => emp.id !== deleteTargetId));
      setSelectedEmployee(null);
      toast.success("Salarié supprimé avec succès");
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
    }
  };

  const handleAddDocument = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      const newDoc: EmployeeDocument = {
        id: Math.random().toString(),
        type: "document",
        file_name: "document_" + new Date().getTime() + ".pdf",
        uploaded_date: new Date().toLocaleDateString("fr-FR"),
      };
      const updated = employees.map(e =>
        e.id === employeeId
          ? { ...e, documents: [...(e.documents || []), newDoc] }
          : e
      );
      setEmployees(updated);
      setSelectedEmployee(updated.find(e => e.id === employeeId) || null);
      toast.success("Document ajouté");
    }
  };

  const handleAddSalarySlip = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      const newSlip = "fiche_paie_" + new Date().getTime() + ".pdf";
      const updated = employees.map(e =>
        e.id === employeeId
          ? { ...e, salary_slips: [...(e.salary_slips || []), newSlip] }
          : e
      );
      setEmployees(updated);
      setSelectedEmployee(updated.find(e => e.id === employeeId) || null);
      toast.success("Fiche de paie ajoutée");
    }
  };

  const handleDeleteDocument = (employeeId: string, docId: string) => {
    const updated = employees.map(e =>
      e.id === employeeId
        ? { ...e, documents: e.documents?.filter(d => d.id !== docId) || [] }
        : e
    );
    setEmployees(updated);
    setSelectedEmployee(updated.find(e => e.id === employeeId) || null);
    toast.success("Document supprimé");
  };

  const handleDownloadDocument = (fileName: string) => {
    toast.success(`Téléchargement de ${fileName} en cours...`);
    // Simulation du téléchargement
    const link = document.createElement('a');
    link.href = '#';
    link.download = fileName;
    // En production, ce serait une vraie URL
  };

  const handleDeleteSalarySlip = (employeeId: string, index: number) => {
    const updated = employees.map(e =>
      e.id === employeeId
        ? { ...e, salary_slips: e.salary_slips?.filter((_, i) => i !== index) || [] }
        : e
    );
    setEmployees(updated);
    setSelectedEmployee(updated.find(e => e.id === employeeId) || null);
    toast.success("Fiche de paie supprimée");
  };

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
                {/* PHOTO UPLOAD */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={photoPreview} />
                    <AvatarFallback>
                      {formData.first_name?.charAt(0)}
                      {formData.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
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
                </div>

                {/* INFORMATIONS PERSONNELLES */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom *</Label>
                    <Input
                      placeholder="Prénom"
                      value={formData.first_name || ""}
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

                {/* UPLOAD FICHE DE POSTE */}
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
                    <div className="mt-2 text-xs text-muted-foreground">
                      Fichier sélectionné : {formData.job_description_file}
                    </div>
                  )}
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
              {filteredEmployees.length === 0 ? (
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
                            {emp.contract_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {emp.salary ? emp.salary.toLocaleString("fr-FR") : "-"} CFA
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                      <p className="text-muted-foreground text-sm">{selectedEmployee.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedEmployee(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Tabs defaultValue="info">
                  <TabsList>
                    <TabsTrigger value="info">Informations</TabsTrigger>
                    <TabsTrigger value="fiche">Fiche de poste</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="salary">Fiches de paie</TabsTrigger>
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
                        <p className="mt-1">{selectedEmployee.phone}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Poste</p>
                        <p className="mt-1">{selectedEmployee.role}</p>
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
                        <p className="mt-1">{selectedEmployee.contract_type}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Date d'embauche</p>
                        <p className="mt-1">{selectedEmployee.hire_date}</p>
                      </div>
                      <div className="border p-4 rounded">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Salaire</p>
                        <p className="mt-1 font-semibold">
                          {selectedEmployee.salary?.toLocaleString("fr-FR")} CFA
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* FICHE DE POSTE */}
                  <TabsContent value="fiche" className="space-y-4 mt-4">
                    <div className="border p-4 rounded bg-slate-50 flex items-center gap-4">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      {selectedEmployee.job_description_file ? (
                        <span className="text-sm">{selectedEmployee.job_description_file}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Aucune fiche de poste uploadée</span>
                      )}
                    </div>
                  </TabsContent>

                  {/* DOCUMENTS */}
                  <TabsContent value="documents" className="mt-4 space-y-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleAddDocument(selectedEmployee.id)}
                    >
                      <FileText className="w-4 h-4" />
                      Ajouter un document
                    </Button>

                    {selectedEmployee.documents && selectedEmployee.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEmployee.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 cursor-pointer group transition">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">{doc.uploaded_date}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDownloadDocument(doc.file_name)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDocument(selectedEmployee.id, doc.id)}
                              >
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
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleAddSalarySlip(selectedEmployee.id)}
                    >
                      <Wallet className="w-4 h-4" />
                      Ajouter une fiche de paie
                    </Button>

                    {selectedEmployee.salary_slips && selectedEmployee.salary_slips.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEmployee.salary_slips.map((slip, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 cursor-pointer group transition">
                            <Wallet className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{slip}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDownloadDocument(slip)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteSalarySlip(selectedEmployee.id, idx)}
                              >
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
                    <Button variant="outline" className="gap-2">
                      <File className="w-4 h-4" />
                      Ajouter un contrat
                    </Button>

                    {selectedEmployee.contract_file ? (
                      <div className="flex items-center gap-3 p-3 border rounded">
                        <File className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{selectedEmployee.contract_file}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucun contrat enregistré</p>
                    )}
                  </TabsContent>

                  {/* CV */}
                  <TabsContent value="cv" className="mt-4 space-y-3">
                    <Button variant="outline" className="gap-2">
                      <File className="w-4 h-4" />
                      Ajouter un CV
                    </Button>

                    {selectedEmployee.cv_file ? (
                      <div className="flex items-center gap-3 p-3 border rounded">
                        <File className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{selectedEmployee.cv_file}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Aucun CV enregistré</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>

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