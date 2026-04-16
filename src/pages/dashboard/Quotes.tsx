import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusBadge, QuoteStatus } from "@/components/shared/StatusBadge";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { logActivity } from "@/lib/activityLog";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  FileText,
  Eye,
  History,
  Send,
  Download,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface QuoteItem {
  id: string;
  quote_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  subtotal: number;
}

interface Quote {
  id: string;
  number: string;
  client_id?: string;
  client_name: string;
  created_at: string;
  expiration_date: string;
  status: QuoteStatus;
  description?: string;
  terms?: string;
  internal_notes?: string;
  total_amount: number;
  tax_amount: number;
  amount_excluding_tax: number;
  items?: QuoteItem[];
  salesperson_id?: string;
  salesperson_name?: string;
  website_url?: string;
  created_by?: string;
  country?: string;
}

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

// ─── Helper : générer un PDF via la Print API du navigateur ──────────────────
const handlePrintPDF = (quote: Quote) => {
  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    envoye: "Envoyé",
    accepte: "Accepté",
    refuse: "Refusé",
    expire: "Expiré",
  };

  const itemsRows =
    quote.items && quote.items.length > 0
      ? quote.items
          .map(
            (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${item.product_name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.unit_price.toLocaleString("fr-FR")} CFA</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.tax_rate}%</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${item.subtotal.toLocaleString("fr-FR")} CFA</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="padding:12px;text-align:center;color:#999;">Aucun article</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8"/>
      <title>Devis ${quote.number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .company { font-size: 22px; font-weight: 700; color: #0d9488; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
                 background: #d1fae5; color: #065f46; }
        h2 { font-size: 18px; margin-bottom: 4px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px;
                background: #f8fafc; border-radius: 8px; padding: 20px; }
        .meta-item label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .meta-item p { margin-top: 4px; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead { background: #f1f5f9; }
        th { padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; }
        .totals { margin-left: auto; width: 280px; }
        .totals div { display: flex; justify-content: space-between; padding: 6px 0;
                      border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        .totals .grand-total { font-size: 15px; font-weight: 700; border-bottom: none; margin-top: 4px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0;
                  font-size: 11px; color: #94a3b8; text-align: center; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company">MCE</div>
          <div style="color:#64748b;margin-top:4px;">CRM MCE</div>
        </div>
        <div style="text-align:right;">
          <h2>Devis ${quote.number}</h2>
          <div style="margin-top:6px;"><span class="badge">${statusLabels[quote.status] || quote.status}</span></div>
        </div>
      </div>

      <div class="meta">
        <div class="meta-item"><label>Client</label><p>${quote.client_name}</p></div>
        <div class="meta-item"><label>Vendeur</label><p>${quote.salesperson_name || "MCE"}</p></div>
        <div class="meta-item"><label>Date de création</label><p>${formatDate(quote.created_at)}</p></div>
        <div class="meta-item"><label>Date d'expiration</label><p>${formatDate(quote.expiration_date)}</p></div>
        ${quote.website_url ? `<div class="meta-item"><label>Site Web</label><p>${quote.website_url}</p></div>` : ""}
      </div>

      ${quote.description ? `<div style="margin-bottom:24px;"><label style="font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600;">Description</label><p style="margin-top:6px;color:#475569;">${quote.description}</p></div>` : ""}

      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th style="text-align:center;">Qté</th>
            <th style="text-align:right;">Prix unitaire</th>
            <th style="text-align:right;">Taxes</th>
            <th style="text-align:right;">Montant</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <div class="totals">
        <div><span>Montant HT</span><span>${(quote.amount_excluding_tax || 0).toLocaleString("fr-FR")} CFA</span></div>
        <div><span>TVA</span><span>${(quote.tax_amount || 0).toLocaleString("fr-FR")} CFA</span></div>
        <div class="grand-total"><span>Total TTC</span><span>${(quote.total_amount || 0).toLocaleString("fr-FR")} CFA</span></div>
      </div>

      ${quote.terms ? `<div style="margin-top:28px;"><label style="font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600;">Conditions de paiement</label><p style="margin-top:6px;color:#475569;">${quote.terms}</p></div>` : ""}

      <div class="footer">Document généré le ${formatDate(new Date().toISOString())} · MCE CRM</div>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Autorisez les popups pour générer le PDF");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
};

// ─── Composant principal ──────────────────────────────────────────────────────

const Quotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newQuote, setNewQuote] = useState({
    number: "",
    client_name: "",
    client_id: "" as string | null,
    expiration_date: "",
    status: "draft" as QuoteStatus,
    country: "",
  });

  // ── Recherche client ───────────────────────────────────────────────────────
  const [clientsList, setClientsList] = useState<{ id: string; first_name: string; last_name: string; country: string }[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id, first_name, last_name, country").order("last_name").then(({ data }) => {
      if (data) setClientsList(data);
    });
  }, []);

  const clientSuggestions = clientSearch.length >= 2
    ? clientsList.filter((c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase())
      ).slice(0, 6)
    : [];
  const [newItem, setNewItem] = useState({
    product_name: "",
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
  });

  // ── Charger les devis ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuotes = async () => {
      setIsLoading(true);
      let query = supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (countryFilter.trim()) {
        query = query.ilike("country", `%${countryFilter.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        toast.error("Erreur lors du chargement des devis");
        console.error(error);
      } else {
        const normalized = (data || []).map((q) => ({
          ...q,
          items: Array.isArray(q.items) ? q.items : [],
        }));
        setQuotes(normalized);
      }
      setIsLoading(false);
    };
    fetchQuotes();
  }, [countryFilter]);

  // ── Filtre texte ───────────────────────────────────────────────────────────
  const filteredQuotes = quotes.filter(
    (q) =>
      q.number.toLowerCase().includes(search.toLowerCase()) ||
      q.client_name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Créer un devis ─────────────────────────────────────────────────────────
  const handleCreateQuote = async () => {
    if (!newQuote.number || !newQuote.client_name) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const quoteToInsert = {
      number: newQuote.number,
      client_name: newQuote.client_name,
      client_id: newQuote.client_id || null,
      expiration_date: newQuote.expiration_date || null,
      status: newQuote.status,
      country: newQuote.country || null,
      total_amount: 0,
      tax_amount: 0,
      amount_excluding_tax: 0,
      salesperson_name: "MCE",
      website_url: "",
    };

    setIsLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .insert([quoteToInsert])
      .select();
    setIsLoading(false);

    if (error) {
      toast.error("Erreur lors de la création du devis");
      console.error(error);
      return;
    }
    if (data && data[0]) {
      const newQ = { ...data[0], items: [] };
      setQuotes([newQ, ...quotes]);
      setSelectedQuote(newQ);
      setShowNewQuoteDialog(false);
      setNewQuote({ number: "", client_name: "", client_id: null, expiration_date: "", status: "draft", country: "" });
      setClientSearch("");
      void logActivity("quote", newQ.id, `Devis ${newQ.number} — ${newQ.client_name}`, "created");
      toast.success("Devis créé avec succès");
    }
  };

  // ── Modifier un devis ──────────────────────────────────────────────────────
  const handleUpdateQuote = async (updatedQuote: Quote) => {
    setIsLoading(true);
    const { id, client_id, created_at, ...fieldsToUpdate } = updatedQuote;

    const { data, error } = await supabase
      .from("quotes")
      .update(fieldsToUpdate)
      .eq("id", id)
      .select();
    setIsLoading(false);

    if (error) {
      toast.error("Erreur lors de la modification du devis");
      console.error(error);
      return;
    }
    if (data && data[0]) {
      const updated = {
        ...data[0],
        items: Array.isArray(data[0].items) ? data[0].items : [],
      };
      setQuotes(quotes.map((q) => (q.id === id ? updated : q)));
      setSelectedQuote(updated);
      void logActivity("quote", id, `Devis ${updatedQuote.number} — ${updatedQuote.client_name}`, "updated");
      toast.success("Devis sauvegardé");
    }
  };

  // ── Ajouter un article ─────────────────────────────────────────────────────
  const handleAddItem = async () => {
    if (!selectedQuote || !newItem.product_name || newItem.unit_price <= 0) {
      toast.error("Veuillez remplir tous les champs correctement");
      return;
    }

    const subtotal = newItem.quantity * newItem.unit_price;
    const tax = subtotal * (newItem.tax_rate / 100);
    const item: QuoteItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      quote_id: selectedQuote.id,
      product_name: newItem.product_name,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      tax_rate: newItem.tax_rate,
      subtotal: subtotal + tax,
    };

    const updatedItems = [...(selectedQuote.items || []), item];
    const totalAmount = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const taxAmount = updatedItems.reduce(
      (sum, i) => sum + i.quantity * i.unit_price * (i.tax_rate / 100),
      0
    );

    const updatedQuote: Quote = {
      ...selectedQuote,
      items: updatedItems,
      total_amount: totalAmount,
      tax_amount: taxAmount,
      amount_excluding_tax: totalAmount - taxAmount,
    };

    setQuotes(quotes.map((q) => (q.id === selectedQuote.id ? updatedQuote : q)));
    setSelectedQuote(updatedQuote);
    setNewItem({ product_name: "", quantity: 1, unit_price: 0, tax_rate: 0 });
    await handleUpdateQuote(updatedQuote);
  };

  // ── Supprimer un article ───────────────────────────────────────────────────
  const handleDeleteItem = async (itemId: string) => {
    if (!selectedQuote) return;

    const updatedItems = selectedQuote.items?.filter((i) => i.id !== itemId) || [];
    const totalAmount = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const taxAmount = updatedItems.reduce(
      (sum, i) => sum + i.quantity * i.unit_price * (i.tax_rate / 100),
      0
    );

    const updatedQuote: Quote = {
      ...selectedQuote,
      items: updatedItems,
      total_amount: totalAmount,
      tax_amount: taxAmount,
      amount_excluding_tax: totalAmount - taxAmount,
    };

    setQuotes(quotes.map((q) => (q.id === selectedQuote.id ? updatedQuote : q)));
    setSelectedQuote(updatedQuote);
    await handleUpdateQuote(updatedQuote);
    toast.success("Article supprimé");
  };

  // ── Supprimer un devis ─────────────────────────────────────────────────────
  const handleDeleteQuote = async () => {
    if (!selectedQuote) return;
    setIsLoading(true);
    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", selectedQuote.id);
    setIsLoading(false);

    if (error) {
      toast.error("Erreur lors de la suppression du devis");
      console.error(error);
      return;
    }
    void logActivity("quote", selectedQuote.id, `Devis ${selectedQuote.number} — ${selectedQuote.client_name}`, "deleted");
    setQuotes(quotes.filter((q) => q.id !== selectedQuote.id));
    setSelectedQuote(null);
    setShowDeleteDialog(false);
    toast.success("Devis supprimé");
  };

  // ── Changer le statut (local uniquement, sauvegarder manuellement) ─────────
  const handleStatusChange = (newStatus: QuoteStatus) => {
    if (!selectedQuote) return;
    const updatedQuote = { ...selectedQuote, status: newStatus };
    setQuotes(quotes.map((q) => (q.id === selectedQuote.id ? updatedQuote : q)));
    setSelectedQuote(updatedQuote);
  };

  // ── Colonnes du tableau ────────────────────────────────────────────────────
  const columns: Column<Quote>[] = [
    {
      key: "number",
      header: "Numéro",
      render: (quote) => (
        <span className="font-semibold text-primary">{quote.number}</span>
      ),
    },
    {
      key: "created_at",
      header: "Date de création",
      render: (quote) => (
        <span className="text-sm">{formatDate(quote.created_at)}</span>
      ),
    },
    {
      key: "client_name",
      header: "Client",
      render: (quote) => <span className="text-sm">{quote.client_name}</span>,
    },
    {
      key: "website_url",
      header: "Site Web",
      render: (quote) => (
        <span className="text-sm text-muted-foreground">
          {quote.website_url || "-"}
        </span>
      ),
    },
    {
      key: "salesperson_name",
      header: "Vendeur",
      render: (quote) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
            {quote.salesperson_name?.charAt(0) || "M"}
          </div>
          <span className="text-sm">{quote.salesperson_name || "MCE"}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Activités",
      render: () => (
        <button className="text-muted-foreground hover:text-foreground transition">
          ○
        </button>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      render: (quote) => (
        <span className="font-semibold">
          {(quote.total_amount || 0).toLocaleString("fr-FR")} CFA
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (quote) => <StatusBadge status={quote.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (quote) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedQuote(quote)}>
              <Eye className="w-4 h-4 mr-2" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrintPDF(quote)}>
              <FileText className="w-4 h-4 mr-2" />
              Télécharger PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="grid grid-cols-12 gap-6">
        {/* LISTE DES DEVIS */}
        <div className="col-span-full">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Gestion des Devis</h1>
              <p className="text-muted-foreground">
                Créez et gérez les devis envoyés aux clients
              </p>
            </div>

            <Dialog open={showNewQuoteDialog} onOpenChange={setShowNewQuoteDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau devis
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-visible">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau devis</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Numéro du devis</Label>
                    <Input
                      placeholder="Ex: S00977"
                      value={newQuote.number}
                      onChange={(e) =>
                        setNewQuote({ ...newQuote, number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Input
                      placeholder="Rechercher un client existant..."
                      value={clientSearch || newQuote.client_name}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setNewQuote({ ...newQuote, client_name: e.target.value, client_id: null });
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
                      autoComplete="off"
                    />
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <div className="mt-1 border border-border rounded-md overflow-hidden divide-y divide-border">
                        {clientSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                            onMouseDown={() => {
                              const fullName = `${c.first_name} ${c.last_name}`;
                              setNewQuote({
                                ...newQuote,
                                client_name: fullName,
                                client_id: c.id,
                                country: newQuote.country || c.country || "",
                              });
                              setClientSearch(fullName);
                              setShowClientSuggestions(false);
                            }}
                          >
                            <span className="font-medium">{c.first_name} {c.last_name}</span>
                            {c.country && <span className="text-xs text-muted-foreground">{c.country}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {newQuote.client_id && (
                      <p className="text-xs text-primary mt-1">✓ Client existant lié</p>
                    )}
                  </div>
                  <div>
                    <Label>Date d'expiration</Label>
                    <Input
                      type="date"
                      value={newQuote.expiration_date}
                      onChange={(e) =>
                        setNewQuote({ ...newQuote, expiration_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Statut</Label>
                    <Select
                      value={newQuote.status}
                      onValueChange={(value) =>
                        setNewQuote({ ...newQuote, status: value as QuoteStatus })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="envoye">Envoyé</SelectItem>
                        <SelectItem value="accepte">Accepté</SelectItem>
                        <SelectItem value="refuse">Refusé</SelectItem>
                        <SelectItem value="expire">Expiré</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Pays</Label>
                    <Select
                      value={newQuote.country || ""}
                      onValueChange={(value) =>
                        setNewQuote({ ...newQuote, country: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sénégal">Sénégal</SelectItem>
                        <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                        <SelectItem value="Mali">Mali</SelectItem>
                        <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                        <SelectItem value="Guinée">Guinée</SelectItem>
                        <SelectItem value="Cameroun">Cameroun</SelectItem>
                        <SelectItem value="Gabon">Gabon</SelectItem>
                        <SelectItem value="Congo">Congo</SelectItem>
                        <SelectItem value="RDC">RDC</SelectItem>
                        <SelectItem value="Togo">Togo</SelectItem>
                        <SelectItem value="Bénin">Bénin</SelectItem>
                        <SelectItem value="Niger">Niger</SelectItem>
                        <SelectItem value="Mauritanie">Mauritanie</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewQuoteDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleCreateQuote} disabled={isLoading}>
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="bg-white border rounded-lg p-4 mb-6 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro ou client..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Select
                value={countryFilter}
                onValueChange={(value) => setCountryFilter(value === "tous" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par pays..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les pays</SelectItem>
                  <SelectItem value="Sénégal">Sénégal</SelectItem>
                  <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                  <SelectItem value="Mali">Mali</SelectItem>
                  <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                  <SelectItem value="Guinée">Guinée</SelectItem>
                  <SelectItem value="Cameroun">Cameroun</SelectItem>
                  <SelectItem value="Gabon">Gabon</SelectItem>
                  <SelectItem value="Congo">Congo</SelectItem>
                  <SelectItem value="RDC">RDC</SelectItem>
                  <SelectItem value="Togo">Togo</SelectItem>
                  <SelectItem value="Bénin">Bénin</SelectItem>
                  <SelectItem value="Niger">Niger</SelectItem>
                  <SelectItem value="Mauritanie">Mauritanie</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TABLEAU DES DEVIS */}
          <DataTable
            columns={columns}
            data={filteredQuotes}
            isLoading={isLoading}
            emptyMessage="Aucun devis trouvé"
            onRowClick={(quote) => setSelectedQuote(quote)}
          />
        </div>

        {/* DÉTAIL DU DEVIS SÉLECTIONNÉ */}
        {selectedQuote && (
          <div className="col-span-full border-t pt-6">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedQuote.number}</h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedQuote.client_name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handlePrintPDF(selectedQuote)}
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Send className="w-4 h-4" />
                    Envoyer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleUpdateQuote(selectedQuote)}
                    disabled={isLoading}
                  >
                    Sauvegarder
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePrintPDF(selectedQuote)}>
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Détails</TabsTrigger>
                  <TabsTrigger value="lines">
                    Lignes ({selectedQuote.items?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* ONGLET DÉTAILS */}
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Client</Label>
                      <Input
                        className="mt-1"
                        value={selectedQuote.client_name || ""}
                        onChange={(e) =>
                          setSelectedQuote({ ...selectedQuote, client_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="font-semibold">Date de création</Label>
                      <p className="text-sm mt-2 text-muted-foreground">{formatDate(selectedQuote.created_at)}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Date d'expiration</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={selectedQuote.expiration_date?.slice(0, 10) || ""}
                        onChange={(e) =>
                          setSelectedQuote({ ...selectedQuote, expiration_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="font-semibold">Statut</Label>
                      <div className="mt-1">
                        <Select
                          value={selectedQuote.status}
                          onValueChange={handleStatusChange}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Brouillon</SelectItem>
                            <SelectItem value="envoye">Envoyé</SelectItem>
                            <SelectItem value="accepte">Accepté</SelectItem>
                            <SelectItem value="refuse">Refusé</SelectItem>
                            <SelectItem value="expire">Expiré</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="font-semibold">Site Web</Label>
                      <Input
                        className="mt-1"
                        placeholder="https://..."
                        value={selectedQuote.website_url || ""}
                        onChange={(e) =>
                          setSelectedQuote({ ...selectedQuote, website_url: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="font-semibold">Vendeur</Label>
                      <Input
                        className="mt-1"
                        value={selectedQuote.salesperson_name || ""}
                        onChange={(e) =>
                          setSelectedQuote({ ...selectedQuote, salesperson_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="font-semibold">Pays</Label>
                      <div className="mt-1">
                        <Select
                          value={selectedQuote.country || ""}
                          onValueChange={(value) =>
                            setSelectedQuote({ ...selectedQuote, country: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner un pays" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sénégal">Sénégal</SelectItem>
                            <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                            <SelectItem value="Mali">Mali</SelectItem>
                            <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                            <SelectItem value="Guinée">Guinée</SelectItem>
                            <SelectItem value="Cameroun">Cameroun</SelectItem>
                            <SelectItem value="Gabon">Gabon</SelectItem>
                            <SelectItem value="Congo">Congo</SelectItem>
                            <SelectItem value="RDC">RDC</SelectItem>
                            <SelectItem value="Togo">Togo</SelectItem>
                            <SelectItem value="Bénin">Bénin</SelectItem>
                            <SelectItem value="Niger">Niger</SelectItem>
                            <SelectItem value="Mauritanie">Mauritanie</SelectItem>
                            <SelectItem value="France">France</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold">Description</Label>
                    <Textarea
                      placeholder="Description du devis..."
                      value={selectedQuote.description || ""}
                      onChange={(e) =>
                        setSelectedQuote({ ...selectedQuote, description: e.target.value })
                      }
                      className="mt-1 min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">Conditions de paiement</Label>
                    <Textarea
                      placeholder="Ex: 30% à la commande, solde à la livraison..."
                      value={selectedQuote.terms || ""}
                      onChange={(e) =>
                        setSelectedQuote({ ...selectedQuote, terms: e.target.value })
                      }
                      className="mt-1 min-h-[80px]"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold">Notes internes</Label>
                    <Textarea
                      placeholder="Notes internes (non visibles au client)..."
                      value={selectedQuote.internal_notes || ""}
                      onChange={(e) =>
                        setSelectedQuote({ ...selectedQuote, internal_notes: e.target.value })
                      }
                      className="mt-1 min-h-[80px]"
                    />
                  </div>
                </TabsContent>

                {/* ONGLET LIGNES */}
                <TabsContent value="lines" className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left">Produit</th>
                          <th className="px-4 py-2 text-center">Quantité</th>
                          <th className="px-4 py-2 text-right">Prix unitaire</th>
                          <th className="px-4 py-2 text-right">Taxes</th>
                          <th className="px-4 py-2 text-right">Montant</th>
                          <th className="px-4 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuote.items && selectedQuote.items.length > 0 ? (
                          selectedQuote.items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-4 py-2">{item.product_name}</td>
                              <td className="px-4 py-2 text-center">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">
                                {item.unit_price.toLocaleString("fr-FR")} CFA
                              </td>
                              <td className="px-4 py-2 text-right">{item.tax_rate}%</td>
                              <td className="px-4 py-2 text-right font-semibold">
                                {item.subtotal.toLocaleString("fr-FR")} CFA
                              </td>
                              <td className="px-4 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-muted-foreground text-sm"
                            >
                              Aucun article — ajoutez-en un ci-dessous
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* AJOUTER UN ARTICLE */}
                  <div className="border rounded-lg p-4 bg-slate-50">
                    <h3 className="font-semibold mb-4">Ajouter un article</h3>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label className="text-xs mb-1 block">Produit</Label>
                        <Input
                          placeholder="Nom produit"
                          value={newItem.product_name}
                          onChange={(e) =>
                            setNewItem({ ...newItem, product_name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Quantité</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={newItem.quantity}
                          onChange={(e) =>
                            setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })
                          }
                          min="1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Prix unitaire</Label>
                        <Input
                          type="number"
                          placeholder="Prix"
                          value={newItem.unit_price}
                          onChange={(e) =>
                            setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Taxes %</Label>
                        <Input
                          type="number"
                          placeholder="Taxes"
                          value={newItem.tax_rate}
                          onChange={(e) =>
                            setNewItem({ ...newItem, tax_rate: parseFloat(e.target.value) || 0 })
                          }
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddItem}
                      className="w-full gap-2"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter l'article
                    </Button>
                  </div>

                  {/* RÉSUMÉ FINANCIER */}
                  <div className="bg-slate-50 border rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Montant HT :</span>
                        <span className="font-semibold">
                          {(selectedQuote.amount_excluding_tax || 0).toLocaleString("fr-FR")} CFA
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA :</span>
                        <span className="font-semibold">
                          {(selectedQuote.tax_amount || 0).toLocaleString("fr-FR")} CFA
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-base font-bold">
                        <span>Total TTC :</span>
                        <span>
                          {(selectedQuote.total_amount || 0).toLocaleString("fr-FR")} CFA
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <Button
              variant="outline"
              onClick={() => setSelectedQuote(null)}
              className="mt-4 gap-2"
            >
              <X className="w-4 h-4" />
              Fermer
            </Button>
          </div>
        )}
      </div>

      {/* HISTORIQUE */}
      <div className="mt-6 border rounded-xl bg-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b">
          <History className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Historique des devis</h2>
        </div>
        <div className="p-4">
          <HistoryPanel entityType="quote" />
        </div>
      </div>

      {/* DIALOG DE SUPPRESSION */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le devis {selectedQuote?.number} sera
            définitivement supprimé.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuote}
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

export default Quotes;