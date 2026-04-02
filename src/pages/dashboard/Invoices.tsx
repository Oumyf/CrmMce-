import { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Types ───────────────────────────────────────────────────────────────────
interface InvoiceLine {
  desc: string;
  qty: number;
  price: number;
}

interface Invoice {
  id: number;
  num: string;
  client: string;
  avatar: string;
  av: string;
  date: string;
  due: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft";
  notes: string;
  lines: InvoiceLine[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
const fmtN = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_MAP = {
  paid:    { label: "Payée",      badge: "bg-[#EAF3DE] text-[#3B6D11]", dot: "bg-[#639922]" },
  pending: { label: "En attente", badge: "bg-[#FAEEDA] text-[#854F0B]", dot: "bg-[#BA7517]" },
  overdue: { label: "En retard",  badge: "bg-[#FCEBEB] text-[#A32D2D]", dot: "bg-[#E24B4A]" },
  draft:   { label: "Brouillon",  badge: "bg-gray-100 text-gray-500",   dot: "bg-gray-400"  },
};

const AV_COLORS: Record<string, string> = {
  "av-blue":   "bg-[#E6F1FB] text-[#185FA5]",
  "av-teal":   "bg-[#E1F5EE] text-[#0F6E56]",
  "av-amber":  "bg-[#FAEEDA] text-[#854F0B]",
  "av-pink":   "bg-[#FBEAF0] text-[#993556]",
  "av-purple": "bg-[#EEEDFE] text-[#534AB7]",
};

const AV_LIST = ["av-blue", "av-teal", "av-amber", "av-pink", "av-purple"];

// ─── Sample data ─────────────────────────────────────────────────────────────
const SAMPLE_INVOICES: Invoice[] = [
  { id: 1, num: "MCE-2025-001", client: "Dakar Digital",  avatar: "DD", av: "av-blue",   date: "2025-01-10", due: "2025-02-10", amount: 850000,  status: "paid",    notes: "Paiement effectué par virement bancaire. Merci pour votre confiance.", lines: [{ desc: "Conception site web", qty: 1, price: 650000 }, { desc: "Hébergement annuel", qty: 1, price: 200000 }] },
  { id: 2, num: "MCE-2025-002", client: "TechSenegal SA", avatar: "TS", av: "av-teal",   date: "2025-01-18", due: "2025-02-18", amount: 1200000, status: "pending",  notes: "Paiement sous 30 jours après réception de la facture.", lines: [{ desc: "Développement application mobile", qty: 1, price: 900000 }, { desc: "Tests & déploiement", qty: 1, price: 300000 }] },
  { id: 3, num: "MCE-2025-003", client: "Orange Sénégal", avatar: "OS", av: "av-amber",  date: "2024-12-01", due: "2025-01-01", amount: 500000,  status: "overdue",  notes: "Facture en retard. Veuillez régulariser sous 7 jours.", lines: [{ desc: "Campagne réseaux sociaux", qty: 2, price: 200000 }, { desc: "Reporting mensuel", qty: 1, price: 100000 }] },
  { id: 4, num: "MCE-2025-004", client: "Bolloré Africa", avatar: "BA", av: "av-purple", date: "2025-02-05", due: "2025-03-05", amount: 2400000, status: "paid",    notes: "Règlement reçu. Projet clôturé avec succès.", lines: [{ desc: "Audit digital complet", qty: 1, price: 800000 }, { desc: "Stratégie marketing 6 mois", qty: 1, price: 1200000 }, { desc: "Formation équipe interne", qty: 2, price: 200000 }] },
  { id: 5, num: "MCE-2025-005", client: "SunuBank",       avatar: "SB", av: "av-pink",   date: "2025-02-20", due: "2025-03-20", amount: 375000,  status: "draft",   notes: "", lines: [{ desc: "Identité visuelle", qty: 1, price: 375000 }] },
];

// ─── Globe SVG Logo ───────────────────────────────────────────────────────────
const MCEGlobe = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {([[20,4],[26,5],[32,9],[36,15],[38,20],[36,25],[32,31],[26,35],[20,36],[14,35],[8,31],[4,25],[2,20],[4,15],[8,9],[14,5]] as [number,number][]).map(([cx,cy],i) => (
      <circle key={`o${i}`} cx={cx} cy={cy} r={1.6} fill={i%3===0?"#00AEEF":"#60D0F8"} />
    ))}
    {([[20,10],[27,13],[30,20],[27,27],[20,30],[13,27],[10,20],[13,13]] as [number,number][]).map(([cx,cy],i) => (
      <circle key={`i${i}`} cx={cx} cy={cy} r={1.2} fill={i%2===0?"#00AEEF":"#60D0F8"} />
    ))}
    <circle cx={20} cy={20} r={1.8} fill="#0A6EBD" />
    <text x="20" y="23" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">MCE</text>
  </svg>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: Invoice["status"] }) => {
  const s = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ─── Invoice Document (used in modal + PDF capture) ───────────────────────────
const InvoiceDocument = ({ inv }: { inv: Invoice }) => {
  const tva = Math.round(inv.amount * 0.18);
  const ttc = inv.amount + tva;
  const s = STATUS_MAP[inv.status];

  return (
    <div id="invoice-print" style={{ backgroundColor: "#ffffff", padding: "2.5rem", fontFamily: "Segoe UI, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid #0A6EBD" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <MCEGlobe size={36} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#0A1F44" }}>
                MCE <span style={{ color: "#00AEEF", fontWeight: 400 }}>Agency</span>
              </div>
              <div style={{ fontSize: 11, color: "#999" }}>Agence digitale & communication</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 8, lineHeight: 1.8 }}>
            Dakar, Sénégal<br />
            contact@mceagency.sn | +221 77 000 00 00<br />
            NINEA : 12345678 9A2
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#999", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Facture</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: "#0A6EBD", marginBottom: 10 }}>{inv.num}</div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${s.badge}`}>
            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>
      </div>

      {/* Parties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 8, fontWeight: 500 }}>De</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>MCE Agency</div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>Dakar, Plateau<br />Sénégal</div>
        </div>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 8, fontWeight: 500 }}>Facturer à</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{inv.client}</div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>Client MCE Agency<br />Sénégal</div>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: "2.5rem", marginBottom: "1.5rem", padding: "12px 16px", backgroundColor: "#F5F7FA", borderRadius: 8 }}>
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>Date d'émission</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(inv.date)}</div>
        </div>
        <div style={{ width: 1, background: "#e0e0e0" }} />
        <div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 4 }}>Date d'échéance</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(inv.due)}</div>
        </div>
      </div>

      {/* Lines table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "linear-gradient(135deg,#0A1F44,#0A6EBD)" }}>
            {["#", "Description", "Qté", "Prix unitaire", "Total"].map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: i >= 2 ? "right" : "left", fontSize: 11, fontWeight: 500, color: "#fff", letterSpacing: "0.04em", width: i === 0 ? 40 : i === 2 ? 60 : i >= 3 ? 130 : "auto" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.lines.map((l, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 1 ? "#F9FAFB" : "#fff" }}>
              <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee" }}>{i + 1}</td>
              <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee" }}>{l.desc}</td>
              <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee", textAlign: "center" }}>{l.qty}</td>
              <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee", textAlign: "right" }}>{fmtN(l.price)} FCFA</td>
              <td style={{ padding: "10px 14px", borderBottom: "0.5px solid #eee", textAlign: "right", fontWeight: 500 }}>{fmtN(l.qty * l.price)} FCFA</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginBottom: "1.5rem" }}>
        {[["Sous-total HT", fmtN(inv.amount) + " FCFA"], ["TVA (18%)", fmtN(tva) + " FCFA"]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", gap: "3rem", fontSize: 13 }}>
            <span style={{ color: "#888", minWidth: 120, textAlign: "right" }}>{label}</span>
            <span style={{ fontWeight: 500, minWidth: 130, textAlign: "right" }}>{val}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: "3rem", fontSize: 15, borderTop: "1.5px solid #0A6EBD", paddingTop: 10, marginTop: 4 }}>
          <span style={{ fontWeight: 500, minWidth: 120, textAlign: "right", color: "#0A6EBD" }}>Total TTC</span>
          <span style={{ fontWeight: 500, minWidth: 130, textAlign: "right", color: "#0A6EBD" }}>{fmtN(ttc)} FCFA</span>
        </div>
      </div>

      {/* Notes */}
      {inv.notes && (
        <div style={{ background: "#F0F7FF", borderRadius: 8, padding: "1rem", fontSize: 12, color: "#555", borderLeft: "3px solid #00AEEF", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#333", marginBottom: 4 }}>Notes & conditions</div>
          {inv.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", paddingTop: "1.5rem", borderTop: "0.5px solid #eee" }}>
        MCE Agency · Dakar, Sénégal · contact@mceagency.sn · +221 77 000 00 00<br />
        Merci pour votre confiance.
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InvoiceManager() {
  const [invoices, setInvoices] = useState<Invoice[]>(SAMPLE_INVOICES);
  const [nextId, setNextId] = useState(6);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [detailInv, setDetailInv] = useState<Invoice | null>(null);
  const [editInv, setEditInv] = useState<Invoice | null | undefined>(undefined); // undefined = closed, null = new
  const [editLines, setEditLines] = useState<InvoiceLine[]>([]);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Derived data ──
  const filtered = invoices.filter(i => {
    if (filter !== "all" && i.status !== filter) return false;
    if (search && !i.client.toLowerCase().includes(search.toLowerCase()) && !i.num.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: invoices.reduce((a, i) => a + i.amount, 0),
    paid: invoices.filter(i => i.status === "paid"),
    pending: invoices.filter(i => i.status === "pending"),
    overdue: invoices.filter(i => i.status === "overdue"),
  };

  // ── Actions ──
  const openDetail = (inv: Invoice) => setDetailInv(inv);
  const closeDetail = () => setDetailInv(null);

  const openEdit = (inv?: Invoice) => {
    setEditInv(inv ?? null);
    setEditLines(inv ? inv.lines.map(l => ({ ...l })) : [{ desc: "", qty: 1, price: 0 }]);
  };
  const closeEdit = () => setEditInv(undefined);

  const saveInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = editLines.reduce((a, l) => a + l.qty * l.price, 0);
    const client = (fd.get("client") as string).trim();
    const inv: Invoice = {
      id: editInv?.id ?? nextId,
      num: (fd.get("num") as string).trim(),
      client,
      avatar: client.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase(),
      av: editInv?.av ?? AV_LIST[Math.floor(Math.random() * AV_LIST.length)],
      date: fd.get("date") as string,
      due: fd.get("due") as string,
      amount,
      status: fd.get("status") as Invoice["status"],
      notes: fd.get("notes") as string,
      lines: editLines.map(l => ({ ...l })),
    };
    if (editInv?.id) {
      setInvoices(prev => prev.map(i => i.id === editInv.id ? inv : i));
    } else {
      setInvoices(prev => [...prev, inv]);
      setNextId(n => n + 1);
    }
    closeEdit();
  };

  const deleteInvoice = (id: number) => {
    if (!window.confirm("Supprimer cette facture ?")) return;
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const cycleStatus = (id: number) => {
    const order: Invoice["status"][] = ["draft", "pending", "paid", "overdue"];
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: order[(order.indexOf(i.status) + 1) % order.length] } : i));
  };

  const handleDownload = async () => {
    if (!detailInv || !printRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
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
      pdf.save(`${detailInv.num}.pdf`);
    } catch {
      alert("Erreur lors de la génération du PDF.");
    }
    setDownloading(false);
  };

  const updateLine = (i: number, field: keyof InvoiceLine, value: string | number) => {
    setEditLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: field === "desc" ? value : Number(value) } : l));
  };

  const editTotal = editLines.reduce((a, l) => a + l.qty * l.price, 0);

  // ── Render ──
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Segoe UI, sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <MCEGlobe />
          <span className="text-base font-medium tracking-wide">
            MCE <span className="text-[#00AEEF] font-normal">Agency</span>
            <span className="text-gray-400 font-normal ml-2">— Factures</span>
          </span>
        </div>
        <button onClick={() => openEdit()} className="flex items-center gap-2 bg-[#0A6EBD] hover:bg-[#0059a0] text-white text-sm px-4 py-2 rounded-lg transition-colors">
          + Nouvelle facture
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-5">
        {[
          { label: "Total facturé", value: fmt(stats.total), sub: `${invoices.length} factures`, color: "text-[#00AEEF]" },
          { label: "Payées",        value: fmt(stats.paid.reduce((a,i)=>a+i.amount,0)), sub: `${stats.paid.length} factures`, color: "text-[#1D9E75]" },
          { label: "En attente",    value: fmt(stats.pending.reduce((a,i)=>a+i.amount,0)), sub: `${stats.pending.length} factures`, color: "text-[#BA7517]" },
          { label: "En retard",     value: fmt(stats.overdue.reduce((a,i)=>a+i.amount,0)), sub: `${stats.overdue.length} factures`, color: "text-[#E24B4A]" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-xl font-medium ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 px-6 pb-4">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher client, numéro..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0A6EBD]"
          />
        </div>
        <div className="flex gap-1">
          {[["all","Toutes"],["paid","Payées"],["pending","En attente"],["overdue","En retard"],["draft","Brouillons"]].map(([val,label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${filter === val ? "bg-[#E6F1FB] text-[#185FA5] border-[#B5D4F4]" : "border-transparent text-gray-500 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="px-6 pb-8 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {["N° Facture","Client","Date","Échéance","Montant","Statut","Actions"].map((h,i) => (
                <th key={h} className="text-left text-[10px] font-medium text-gray-400 uppercase tracking-wider pb-2 px-3 border-b border-gray-100" style={i===6?{textAlign:"right"}:{}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucune facture trouvée.</td></tr>
            )}
            {filtered.map(inv => (
              <tr
                key={inv.id}
                onClick={() => openDetail(inv)}
                className="cursor-pointer hover:bg-gray-50 transition-colors group"
              >
                <td className="px-3 py-3 border-b border-gray-50">
                  <span className="font-medium text-[#0A6EBD]">{inv.num}</span>
                </td>
                <td className="px-3 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${AV_COLORS[inv.av] ?? "bg-gray-100 text-gray-600"}`}>
                      {inv.avatar}
                    </div>
                    <span className="text-gray-800">{inv.client}</span>
                  </div>
                </td>
                <td className="px-3 py-3 border-b border-gray-50 text-gray-500">{formatDate(inv.date)}</td>
                <td className="px-3 py-3 border-b border-gray-50 text-gray-500">{formatDate(inv.due)}</td>
                <td className="px-3 py-3 border-b border-gray-50 font-medium text-gray-800">{fmt(inv.amount)}</td>
                <td className="px-3 py-3 border-b border-gray-50"><StatusBadge status={inv.status} /></td>
                <td className="px-3 py-3 border-b border-gray-50" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => openDetail(inv)} className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-100" title="Voir">👁</button>
                    <button onClick={() => openEdit(inv)} className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-100" title="Modifier">✎</button>
                    <button onClick={() => cycleStatus(inv.id)} className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-100" title="Statut">↻</button>
                    <button onClick={() => deleteInvoice(inv.id)} className="px-2 py-1 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-[#FCEBEB] hover:text-[#A32D2D] hover:border-[#F7C1C1]" title="Supprimer">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════
          DETAIL MODAL
      ════════════════════════════════════════ */}
      {detailInv && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeDetail(); }}
        >
          <div className="bg-white rounded-xl border border-gray-100 w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl">
            {/* Topbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600 text-lg px-1">✕</button>
                <span className="text-sm text-gray-400">{detailInv.num}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { closeDetail(); openEdit(detailInv); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 border border-[#0A6EBD] text-[#0A6EBD] rounded-lg hover:bg-[#E6F1FB] transition-colors"
                >
                  ✎ Modifier
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  🖨 Imprimer
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#0A6EBD] hover:bg-[#0059a0] text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {downloading ? "⏳ Génération..." : "⬇ Télécharger PDF"}
                </button>
              </div>
            </div>

            {/* Invoice doc */}
            <div ref={printRef}>
              <InvoiceDocument inv={detailInv} />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          EDIT MODAL
      ════════════════════════════════════════ */}
      {editInv !== undefined && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="bg-white rounded-xl border border-gray-100 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-base font-medium">{editInv?.id ? "Modifier la facture" : "Nouvelle facture"}</span>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={saveInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Numéro de facture</label>
                  <input name="num" required defaultValue={editInv?.num ?? `MCE-2025-00${nextId}`} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A6EBD]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Statut</label>
                  <select name="status" defaultValue={editInv?.status ?? "draft"} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A6EBD] bg-white">
                    <option value="draft">Brouillon</option>
                    <option value="pending">En attente</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Client</label>
                <input name="client" required defaultValue={editInv?.client ?? ""} placeholder="Nom du client ou entreprise" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A6EBD]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date d'émission</label>
                  <input name="date" type="date" defaultValue={editInv?.date ?? new Date().toISOString().split("T")[0]} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A6EBD]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date d'échéance</label>
                  <input name="due" type="date" defaultValue={editInv?.due ?? ""} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#0A6EBD]" />
                </div>
              </div>

              {/* Lines */}
              <div>
                <label className="block text-xs text-gray-500 mb-2">Lignes de facturation</label>
                <table className="w-full text-xs border-collapse mb-1">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Description","Qté","Prix unit.","Total"].map(h => (
                        <th key={h} className="text-left px-2 py-1.5 font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editLines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-1 py-1">
                          <input value={l.desc} onChange={e => updateLine(i,"desc",e.target.value)} placeholder="Description" className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#0A6EBD]" />
                        </td>
                        <td className="px-1 py-1 w-14">
                          <input type="number" value={l.qty} min={1} onChange={e => updateLine(i,"qty",e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:border-[#0A6EBD]" />
                        </td>
                        <td className="px-1 py-1 w-24">
                          <input type="number" value={l.price} min={0} onChange={e => updateLine(i,"price",e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#0A6EBD]" />
                        </td>
                        <td className="px-2 py-1 text-right text-gray-600 w-24">{fmtN(l.qty*l.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => setEditLines(prev => [...prev,{desc:"",qty:1,price:0}])} className="text-xs text-[#00AEEF] hover:opacity-80 flex items-center gap-1 mt-1">
                  + Ajouter une ligne
                </button>
                <div className="flex justify-end gap-4 mt-2 text-sm">
                  <span className="text-gray-500">Total HT</span>
                  <span className="font-medium">{fmt(editTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes / conditions</label>
                <textarea name="notes" defaultValue={editInv?.notes ?? ""} rows={3} placeholder="Ex : Paiement sous 30 jours..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#0A6EBD]" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeEdit} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-[#0A6EBD] hover:bg-[#0059a0] text-white rounded-lg transition-colors">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}