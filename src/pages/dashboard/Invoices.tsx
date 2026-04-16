import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Column, DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { logActivity } from "@/lib/activityLog";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";

interface InvoiceLine {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  num: string;
  client_id?: string;
  client: string;
  avatar: string;
  av: string;
  date: string;
  due: string;
  amount: number;
  status: InvoiceStatus;
  notes: string;
  country: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  lines?: InvoiceLine[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const fmtN = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function formatDate(d: string) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  } catch {
    return d;
  }
}

const STATUS_MAP = {
  paid: {
    label: "Payée",
    badge: "bg-[#EAF3DE] text-[#3B6D11]",
    dot: "bg-[#639922]",
    color: "text-[#3B6D11]",
  },
  pending: {
    label: "En attente",
    badge: "bg-[#FAEEDA] text-[#854F0B]",
    dot: "bg-[#BA7517]",
    color: "text-[#854F0B]",
  },
  overdue: {
    label: "En retard",
    badge: "bg-[#FCEBEB] text-[#A32D2D]",
    dot: "bg-[#E24B4A]",
    color: "text-[#A32D2D]",
  },
  draft: {
    label: "Brouillon",
    badge: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
    color: "text-gray-600",
  },
};

const AV_COLORS: Record<string, string> = {
  "av-blue": "bg-[#E6F1FB] text-[#185FA5]",
  "av-teal": "bg-[#E1F5EE] text-[#0F6E56]",
  "av-amber": "bg-[#FAEEDA] text-[#854F0B]",
  "av-pink": "bg-[#FBEAF0] text-[#993556]",
  "av-purple": "bg-[#EEEDFE] text-[#534AB7]",
};

const AV_LIST = ["av-blue", "av-teal", "av-amber", "av-pink", "av-purple"];

// ─── Invoice Document (pour PDF et impression) ─────────────────────────────
const InvoiceDocument = ({ inv }: { inv: Invoice }) => {
  const tva = Math.round(inv.amount * 0.18);
  const ttc = inv.amount + tva;
  const s = STATUS_MAP[inv.status];

  return (
    <div
      id="invoice-print"
      style={{
        backgroundColor: "#ffffff",
        padding: "2.5rem",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          paddingBottom: "1.5rem",
          borderBottom: "2px solid #0A6EBD",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, color: "#0A1F44" }}>
            MCE <span style={{ color: "#00AEEF", fontWeight: 400 }}>Agency</span>
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 8, lineHeight: 1.8 }}>
            Dakar, Sénégal<br />
            contact@mceagency.sn | +221 77 000 00 00<br />
            NINEA : 12345678 9A2
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#999",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Facture
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, color: "#0A6EBD", marginBottom: 10 }}>
            {inv.num}
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: "9999px",
              fontSize: 12,
              fontWeight: 500,
            }}
            className={s.badge}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%" }} className={s.dot} />
            {s.label}
          </span>
        </div>
      </div>

      {/* Parties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 8, fontWeight: 500 }}>
            De
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>MCE Agency</div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
            Dakar, Plateau<br />
            Sénégal
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 8, fontWeight: 500 }}>
            Facturer à
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{inv.client}</div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
            Client MCE Agency<br />
            {inv.country}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div
        style={{
          display: "flex",
          gap: "2.5rem",
          marginBottom: "1.5rem",
          padding: "12px 16px",
          backgroundColor: "#F5F7FA",
          borderRadius: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>
            Date d'émission
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(inv.date)}</div>
        </div>
        <div style={{ width: 1, background: "#e0e0e0" }} />
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>
            Date d'échéance
          </div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(inv.due)}</div>
        </div>
      </div>

      {/* Lines table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "linear-gradient(135deg,#0A1F44,#0A6EBD)" }}>
            {["#", "Description", "Qté", "Prix unitaire", "Total"].map((h, i) => (
              <th
                key={i}
                style={{
                  padding: "10px 14px",
                  textAlign: i >= 2 ? "right" : "left",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "0.04em",
                  width: i === 0 ? 40 : i === 2 ? 60 : i >= 3 ? 130 : "auto",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.lines && inv.lines.length > 0 ? (
            inv.lines.map((l, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 1 ? "#F9FAFB" : "#fff" }}>
                <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee" }}>{i + 1}</td>
                <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee" }}>{l.description}</td>
                <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee", textAlign: "center" }}>
                  {l.quantity}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee", textAlign: "right" }}>
                  {fmtN(l.unit_price)} FCFA
                </td>
                <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee", textAlign: "right", fontWeight: 500 }}>
                  {fmtN(l.quantity * l.unit_price)} FCFA
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: 12 }}>
                Aucune ligne de facturation
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginBottom: "1.5rem" }}>
        {[
          ["Sous-total HT", fmtN(inv.amount) + " FCFA"],
          ["TVA (18%)", fmtN(tva) + " FCFA"],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: "3rem", fontSize: 13 }}>
            <span style={{ color: "#888", minWidth: 120, textAlign: "right" }}>{label}</span>
            <span style={{ fontWeight: 500, minWidth: 130, textAlign: "right" }}>{val}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: "3rem", fontSize: 15, borderTop: "1.5px solid #0A6EBD", paddingTop: 10, marginTop: 4 }}>
          <span style={{ fontWeight: 500, minWidth: 120, textAlign: "right", color: "#0A6EBD" }}>
            Total TTC
          </span>
          <span style={{ fontWeight: 500, minWidth: 130, textAlign: "right", color: "#0A6EBD" }}>
            {fmtN(ttc)} FCFA
          </span>
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div
          style={{
            background: "#F0F7FF",
            borderRadius: 8,
            padding: "1rem",
            fontSize: 12,
            color: "#555",
            borderLeft: "3px solid #00AEEF",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: "#333", marginBottom: 4 }}>
            Notes & conditions
          </div>
          {inv.notes}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#aaa",
          paddingTop: "1.5rem",
          borderTop: "0.5px solid #eee",
        }}
      >
        MCE Agency · Dakar, Sénégal · contact@mceagency.sn · +221 77 000 00 00<br />
        Merci pour votre confiance.
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editLines, setEditLines] = useState<InvoiceLine[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");

  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Recherche client pour le formulaire ───────────────────────────────────
  const [clientsList, setClientsList] = useState<{ id: string; first_name: string; last_name: string; country: string }[]>([]);
  const [invoiceClientSearch, setInvoiceClientSearch] = useState("");
  const [invoiceClientId, setInvoiceClientId] = useState<string | null>(null);
  const [showInvoiceClientSuggestions, setShowInvoiceClientSuggestions] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id, first_name, last_name, country").order("last_name").then(({ data }) => {
      if (data) setClientsList(data);
    });
  }, []);

  const invoiceClientSuggestions = invoiceClientSearch.length >= 2
    ? clientsList.filter((c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(invoiceClientSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  // ─── Load invoices ──
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: invData, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      const invoicesWithLines = await Promise.all(
        (invData || []).map(async (inv) => {
          const { data: lines } = await supabase
            .from("invoice_line_items")
            .select("*")
            .eq("invoice_id", inv.id);

          return {
            ...inv,
            lines: lines || [],
          };
        })
      );

      setInvoices(invoicesWithLines as Invoice[]);
    } catch (error: any) {
      toast.error("Erreur de chargement des factures");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // ─── Filtered data ──
  const filtered = invoices.filter((inv) => {
    const searchMatch =
      inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.num.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = selectedStatus === "all" || inv.status === selectedStatus;
    const countryMatch = selectedCountry === "all" || inv.country?.toLowerCase() === selectedCountry.toLowerCase();
    return searchMatch && statusMatch && countryMatch;
  });

  // ─── Stats ──
  const stats = {
    total: invoices.reduce((a, i) => a + i.amount, 0),
    paid: invoices.filter((i) => i.status === "paid"),
    pending: invoices.filter((i) => i.status === "pending"),
    overdue: invoices.filter((i) => i.status === "overdue"),
  };

  // ─── Actions ──
  const handleOpenModal = (invoice: Invoice | null = null) => {
    setEditingInvoice(invoice);
    if (invoice) {
      setEditLines(invoice.lines || []);
      setInvoiceClientSearch(invoice.client || "");
      setInvoiceClientId(invoice.client_id || null);
    } else {
      setEditLines([{ description: "", quantity: 1, unit_price: 0 }]);
      setInvoiceClientSearch("");
      setInvoiceClientId(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const amount = editLines.reduce((a, l) => a + l.quantity * l.unit_price, 0);
      const client = (fd.get("client") as string).trim();
      const num = (fd.get("num") as string).trim();

      const invoiceData = {
        num,
        client,
        client_id: invoiceClientId || null,
        avatar: client
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase(),
        av: editingInvoice?.av || AV_LIST[Math.floor(Math.random() * AV_LIST.length)],
        date: fd.get("date") as string,
        due: fd.get("due") as string,
        amount,
        status: fd.get("status") as InvoiceStatus,
        notes: fd.get("notes") as string,
        country: fd.get("country") as string,
      };

      if (editingInvoice?.id) {
        // Update
        const { error: updateError } = await supabase
          .from("invoices")
          .update(invoiceData)
          .eq("id", editingInvoice.id);

        if (updateError) throw updateError;

        // Delete old lines
        await supabase.from("invoice_line_items").delete().eq("invoice_id", editingInvoice.id);

        // Insert new lines
        if (editLines.length > 0) {
          const { error: insertError } = await supabase.from("invoice_line_items").insert(
            editLines
              .filter((l) => l.description || l.unit_price)
              .map((l) => ({
                invoice_id: editingInvoice.id,
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
              }))
          );
          if (insertError) throw insertError;
        }

        void logActivity("invoice", editingInvoice.id, `Facture ${invoiceData.num} — ${invoiceData.client}`, "updated");
        toast.success("Facture mise à jour");
      } else {
        // Create
        const { data: newInv, error: insertError } = await supabase
          .from("invoices")
          .insert([invoiceData])
          .select("id")
          .single();

        if (insertError) throw insertError;

        if (newInv && editLines.length > 0) {
          const { error: insertLinesError } = await supabase.from("invoice_line_items").insert(
            editLines
              .filter((l) => l.description || l.unit_price)
              .map((l) => ({
                invoice_id: newInv.id,
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
              }))
          );
          if (insertLinesError) throw insertLinesError;
        }

        if (newInv) void logActivity("invoice", newInv.id, `Facture ${invoiceData.num} — ${invoiceData.client}`, "created");
        toast.success("Facture créée");
      }

      setIsModalOpen(false);
      await fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) return;

    try {
      const invoiceToDelete = invoices.find((inv) => inv.id === id);
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      if (invoiceToDelete) {
        void logActivity("invoice", id, `Facture ${invoiceToDelete.num} — ${invoiceToDelete.client}`, "deleted");
      }
      toast.success("Facture supprimée");
      await fetchInvoices();
    } catch (error: any) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleCycleStatus = async (id: string) => {
    try {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return;

      const order: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"];
      const newStatus = order[(order.indexOf(inv.status) + 1) % order.length];

      const { error } = await supabase.from("invoices").update({ status: newStatus }).eq("id", id);
      if (error) throw error;

      await fetchInvoices();
      toast.success(`Statut changé en: ${STATUS_MAP[newStatus].label}`);
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // ❌ SUPPRIMEZ ces imports en haut du fichier :
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";

// ... reste du code ...

// ✅ REMPLACEZ la fonction handleDownloadPDF par :
const handleDownloadPDF = async () => {
  if (!selectedInvoice || !printRef.current) return;
  setDownloading(true);

  try {
    // 🚀 Chargement dynamique des bibliothèques lourdes
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const ratio = pw / canvas.width;
    const drawH = canvas.height * ratio;

    let y = 0;
    while (y < drawH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(img, "PNG", 0, -y, pw, drawH);
      y += ph;
    }

    pdf.save(`${selectedInvoice.num}.pdf`);
    toast.success("PDF téléchargé");
  } catch (error) {
    toast.error("Erreur lors de la génération du PDF");
  } finally {
    setDownloading(false);
  }
};

  const updateLine = (i: number, field: keyof InvoiceLine, value: string | number) => {
    setEditLines((prev) =>
      prev.map((l, idx) =>
        idx === i ? { ...l, [field]: field === "description" ? value : Number(value) } : l
      )
    );
  };

  const editTotal = editLines.reduce((a, l) => a + l.quantity * l.unit_price, 0);

  // ─── Columns ──
  const columns: Column<Invoice>[] = [
    {
      key: "num",
      header: "N° Facture",
      render: (inv) => <span className="font-medium text-[#0A6EBD]">{inv.num}</span>,
    },
    {
      key: "client",
      header: "Client",
      render: (inv) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
              AV_COLORS[inv.av] || "bg-gray-100"
            }`}
          >
            {inv.avatar}
          </div>
          <span className="font-medium">{inv.client}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (inv) => <span className="text-sm">{formatDate(inv.date)}</span>,
    },
    {
      key: "due",
      header: "Échéance",
      render: (inv) => <span className="text-sm">{formatDate(inv.due)}</span>,
    },
    {
      key: "amount",
      header: "Montant",
      render: (inv) => <span className="font-medium">{fmt(inv.amount)}</span>,
    },
    {
      key: "status",
      header: "Statut",
      render: (inv) => {
        const s = STATUS_MAP[inv.status];
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (inv) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedInvoice(inv);
                setIsDetailsOpen(true);
              }}
            >
              <Eye className="w-4 h-4 mr-2" /> Voir détails
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenModal(inv)}>
              <Pencil className="w-4 h-4 mr-2" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleCycleStatus(inv.id)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Changer statut
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteInvoice(inv.id)}>
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Factures</h1>
            <p className="text-muted-foreground">Gestion des factures, paiements et relances clients</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Nouvelle facture
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: "Total facturé",
              value: fmt(stats.total),
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Payées",
              value: fmt(stats.paid.reduce((a, i) => a + i.amount, 0)),
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "En attente",
              value: fmt(stats.pending.reduce((a, i) => a + i.amount, 0)),
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "En retard",
              value: fmt(stats.overdue.reduce((a, i) => a + i.amount, 0)),
              color: "text-red-600",
              bg: "bg-red-50",
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-lg p-4`}>
              <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchPlaceholder="Rechercher par client, numéro..."
          onSearchChange={setSearchQuery}
          onCountryChange={setSelectedCountry}
          selectedCountry={selectedCountry}
          additionalFilters={
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-teal-600" />
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage="Aucune facture trouvée." />
        )}

        {/* Modal : Edit/Create Invoice */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                {editingInvoice ? (
                  <>
                    <FileText className="w-5 h-5 text-teal-600" />
                    Modifier la facture {editingInvoice.num}
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-teal-600" />
                    Nouvelle facture
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveInvoice} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">N° Facture</Label>
                  <Input
                    name="num"
                    defaultValue={editingInvoice?.num || `MCE-2025-${String(invoices.length + 1).padStart(3, "0")}`}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Statut</Label>
                  <Select name="status" defaultValue={editingInvoice?.status || "draft"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="paid">Payée</SelectItem>
                      <SelectItem value="overdue">En retard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label className="font-semibold">Client</Label>
                <Input
                  name="client"
                  placeholder="Rechercher un client existant..."
                  value={invoiceClientSearch}
                  onChange={(e) => {
                    setInvoiceClientSearch(e.target.value);
                    setInvoiceClientId(null);
                    setShowInvoiceClientSuggestions(true);
                  }}
                  onFocus={() => setShowInvoiceClientSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowInvoiceClientSuggestions(false), 150)}
                  autoComplete="off"
                  required
                />
                {showInvoiceClientSuggestions && invoiceClientSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                    {invoiceClientSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onMouseDown={() => {
                          const fullName = `${c.first_name} ${c.last_name}`;
                          setInvoiceClientSearch(fullName);
                          setInvoiceClientId(c.id);
                          setShowInvoiceClientSuggestions(false);
                        }}
                      >
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        {c.country && <span className="ml-2 text-xs text-muted-foreground">{c.country}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {invoiceClientId && (
                  <p className="text-xs text-teal-600 mt-1">✓ Client existant lié</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Pays</Label>
                  <Select name="country" defaultValue={editingInvoice?.country || "Sénégal"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sénégal">Sénégal</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Maroc">Maroc</SelectItem>
                      <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                      <SelectItem value="Belgique">Belgique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Date d'émission</Label>
                  <Input
                    name="date"
                    type="date"
                    defaultValue={editingInvoice?.date || new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Date d'échéance</Label>
                <Input name="due" type="date" defaultValue={editingInvoice?.due || ""} required />
              </div>

              {/* Lines */}
              <div className="space-y-2 border-t pt-4">
                <Label className="font-bold text-teal-600">Lignes de facturation</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-slate-700">Description</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-700 w-16">Qté</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-700 w-24">Prix unit.</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-700 w-20">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {editLines.map((l, i) => (
                        <tr key={i}>
                          <td className="px-2 py-2">
                            <Input
                              value={l.description}
                              onChange={(e) => updateLine(i, "description", e.target.value)}
                              placeholder="Description du service"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              value={l.quantity}
                              min={1}
                              onChange={(e) => updateLine(i, "quantity", e.target.value)}
                              className="text-xs text-center"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              value={l.unit_price}
                              min={0}
                              onChange={(e) => updateLine(i, "unit_price", e.target.value)}
                              className="text-xs text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                            {fmtN(l.quantity * l.unit_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setEditLines((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }])}
                >
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                </Button>

                <div className="flex justify-end gap-4 text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Total HT :</span>
                  <span className="font-bold text-[#0A6EBD]">{fmt(editTotal)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Notes / Conditions</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingInvoice?.notes}
                  placeholder="Ex: Paiement sous 30 jours, modalités spéciales..."
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                  {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  {editingInvoice ? "Mettre à jour" : "Créer la facture"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal : Details + PDF */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  {selectedInvoice?.num}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-2"
                  >
                    <Printer className="w-4 h-4" /> Imprimer
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="gap-2 bg-teal-600 hover:bg-teal-700"
                  >
                    {downloading ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                    Télécharger PDF
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedInvoice && (
              <div ref={printRef}>
                <InvoiceDocument inv={selectedInvoice} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* HISTORIQUE */}
        <div className="mt-6 border rounded-xl bg-card">
          <details>
            <summary className="flex items-center gap-2 p-4 cursor-pointer font-semibold text-sm select-none">
              <History className="w-4 h-4 text-muted-foreground" />
              Historique des factures
            </summary>
            <div className="px-4 pb-4">
              <HistoryPanel entityType="invoice" />
            </div>
          </details>
        </div>
      </div>
    </DashboardLayout>
  );
}
