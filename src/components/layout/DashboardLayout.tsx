import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  UserCheck, UserPlus, Users
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NotificationHeader } from "../shared/NotificationHeader";

// --- CONFIGURATION NAVIGATION ---
interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Tableau de bord",  href: "/dashboard" },
  { icon: <Users         className="w-5 h-5" />, label: "Prospect",           href: "/dashboard/Leads" },
  { icon: <UserCheck     className="w-5 h-5" />, label: "Clients",            href: "/dashboard/clients" },
  { icon: <FolderKanban  className="w-5 h-5" />, label: "Projets",            href: "/dashboard/projects" },
  { icon: <CheckSquare   className="w-5 h-5" />, label: "Tâches",             href: "/dashboard/tasks" },
  { icon: <Calendar      className="w-5 h-5" />, label: "Calendrier",         href: "/dashboard/calendar" },
  { icon: <MessageSquare className="w-5 h-5" />, label: "Collaboration",      href: "/dashboard/collaboration" },
  { icon: <FileText      className="w-5 h-5" />, label: "Devis",              href: "/dashboard/quotes",      adminOnly: true },
  { icon: <FileText      className="w-5 h-5" />, label: "Factures",           href: "/dashboard/invoices",    adminOnly: true },
  { icon: <UserPlus      className="w-5 h-5" />, label: "Recrutement",        href: "/dashboard/recruitment", adminOnly: true },
  { icon: <Users         className="w-5 h-5" />, label: "Utilisateurs",       href: "/dashboard/users",       adminOnly: true },
  { icon: <Settings      className="w-5 h-5" />, label: "Paramètres",         href: "/dashboard/settings" },
];

// ─── MCE Logo — clés uniques garanties ──────────────────────────────────────
const outerDots: [number, number][] = [
  [20,4],[26,5],[32,9],[36,15],[38,20],[36,25],[32,31],[26,35],
  [20,36],[14,35],[8,31],[4,25],[2,20],[4,15],[8,9],[14,5],
];
const innerDots: [number, number][] = [
  [20,10],[27,13],[30,20],[27,27],[20,30],[13,27],[10,20],[13,13],
];

const MCELogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {outerDots.map(([cx, cy], i) => (
      <circle
        key={`outer-dot-${i}`}
        cx={cx} cy={cy} r={1.6}
        fill={i % 3 === 0 ? "#00AEEF" : "#60D0F8"}
      />
    ))}
    {innerDots.map(([cx, cy], i) => (
      <circle
        key={`inner-dot-${i}`}
        cx={cx} cy={cy} r={1.2}
        fill={i % 2 === 0 ? "#00AEEF" : "#60D0F8"}
      />
    ))}
    <circle cx={20} cy={20} r={1.8} fill="#0A6EBD" />
    <text
      x="20" y="23"
      textAnchor="middle"
      fontSize="6.5"
      fontWeight="bold"
      fill="white"
      fontFamily="sans-serif"
    >
      MCE
    </text>
  </svg>
);

// ─── DashboardLayout ──────────────────────────────────────────────────────────
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { profile, loading, isAdmin } = useProfile();

  // ── Filtrage nav : on attend que le profil soit chargé avant de masquer
  // les items admin. Si profile est null (encore en chargement), on les
  // affiche par défaut — ils seront masqués si l'user n'est pas admin.
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin || profile === null
  );

  const handleNotificationRedirect = (projectId: string) => {
    navigate(`/dashboard/projects/${projectId}?tab=comments`);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const getInitials = () => {
    if (!profile?.first_name) return "U";
    return (profile.first_name[0] + (profile.last_name?.[0] || "")).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/mce-logo.png" className="w-10 h-10 object-contain rounded-xl" alt="MCE" />
            {!collapsed && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold tracking-tight text-sidebar-foreground">MCE</span>
                <span className="text-[10px] text-sidebar-muted font-medium">Agency</span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation — key = href (toujours unique) */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </nav>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <img src="/mce-logo.png" className="h-9 w-auto object-contain" alt="MCE" />
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-sm font-bold text-foreground">MCE Agency</span>
                <span className="text-[10px] text-muted-foreground">Management Communication Event</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            {!loading && profile?.id && (
              <NotificationHeader
                userId={profile.id}
                onNotificationClick={handleNotificationRedirect}
              />
            )}

            <div className="flex items-center gap-3 border-l pl-4">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold leading-none">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">
                      {profile?.role === "superadmin" ? "Super Admin" : profile?.role}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                    <span className="text-primary font-bold text-xs">{getInitials()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};