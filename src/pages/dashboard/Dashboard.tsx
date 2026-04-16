import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  CheckSquare,
  Clock,
  FolderKanban,
  Loader2,
  UserCheck,
  Users
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// --- Types ---
interface CountryStat {
  country: string;
  count: number;
}

interface DashboardState {
  stats: any;
  activities: any[];
  upcomingProjects: any[];
  countries: CountryStat[];
}

// --- Composant StatCard (mémorisé) ---
interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
}

const StatCard = React.memo(({ title, value, change, changeType = "neutral", icon }: StatCardProps) => (
  <div className="stat-card bg-card p-6 rounded-xl border border-border shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-xl bg-primary/10">
        {icon}
      </div>
      {change && (
        <span className={`text-sm font-medium ${
          changeType === "positive" ? "text-success" : 
          changeType === "negative" ? "text-destructive" : 
          "text-muted-foreground"
        }`}>
          {change}
        </span>
      )}
    </div>
    <h3 className="text-3xl font-bold font-display text-foreground mb-1">{value}</h3>
    <p className="text-sm text-muted-foreground">{title}</p>
  </div>
));

// 🔥 CACHE GLOBAL (survit aux changements d'onglet)
let dashboardCache: {
  data: DashboardState | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30000; // 30 secondes

const Dashboard = () => {
  const { displayName } = useProfile();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardState | null>(dashboardCache?.data || null);
  const [loading, setLoading] = useState(!dashboardCache?.data);

 // 🚀 Fonction de fetch mémorisée avec cache et timeout
const fetchDashboardData = useCallback(async (force = false) => {
  // Vérifier le cache
  if (!force && dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_DURATION) {
    console.log("📦 Utilisation du cache");
    setData(dashboardCache.data);
    setLoading(false);
    return;
  }

  try {
    setLoading(true);

    const today = new Date();
    const next3 = new Date(); next3.setDate(today.getDate() + 3);
    const next7 = new Date(); next7.setDate(today.getDate() + 7);

    const fetchPromise = Promise.all([
      // Stats : comptages directs sur les vraies tables
      supabase.from('leads').select('id, created_at', { count: 'exact' }),
      supabase.from('clients').select('id, status, country', { count: 'exact' }),
      supabase.from('projects').select('id, status', { count: 'exact' }),
      supabase.from('tasks').select('id, status, end_date', { count: 'exact' }),
      // Projets avec deadlines proches
      supabase.from('projects')
        .select('id, name, deadline')
        .eq('status', 'en_cours')
        .not('deadline', 'is', null)
        .order('deadline', { ascending: true })
        .limit(20),
    ]);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Dashboard timeout')), 10000)
    );

    const [leadsRes, clientsRes, projectsRes, tasksRes, upcomingRes] = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]) as any;

    // Calcul des stats
    const allLeads = leadsRes.data || [];
    const newLeads = allLeads.filter((l: any) => {
      const created = new Date(l.created_at);
      const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
      return created >= weekAgo;
    }).length;

    const allClients = clientsRes.data || [];
    const confirmedClients = allClients.filter((c: any) => c.status?.toLowerCase() === 'confirmé').length;

    const allProjects = projectsRes.data || [];
    const activeProjects = allProjects.filter((p: any) => p.status === 'en_cours').length;

    const allTasks = tasksRes.data || [];
    const pendingTasks = allTasks.filter((t: any) => t.status !== 'terminee').length;
    const overdueTasks = allTasks.filter((t: any) =>
      t.status !== 'terminee' && t.end_date && new Date(t.end_date) < today
    ).length;

    const stats = {
      total_Leads: leadsRes.count ?? allLeads.length,
      new_Leads: newLeads,
      confirmed_clients: confirmedClients,
      total_clients: clientsRes.count ?? allClients.length,
      active_projects: activeProjects,
      total_projects: projectsRes.count ?? allProjects.length,
      pending_tasks: pendingTasks,
      overdue_tasks: overdueTasks,
    };

    // Catégorisation des échéances
    const categorized = (upcomingRes.data || [])
      .filter((p: any) => new Date(p.deadline) <= next7)
      .map((p: any) => {
        const deadline = new Date(p.deadline);
        let level = "soon";
        if (deadline < today) level = "overdue";
        else if (deadline <= next3) level = "urgent";
        return { ...p, level };
      });

    const countryCounts = allClients.reduce((acc: any, curr: any) => {
      const country = curr.country || "Non défini";
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    const formattedCountries = Object.keys(countryCounts)
      .map(key => ({ country: key, count: countryCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const newData = {
      stats,
      activities: [],
      upcomingProjects: categorized,
      countries: formattedCountries
    };

    // 💾 Mise en cache
    dashboardCache = {
      data: newData,
      timestamp: Date.now()
    };

    setData(newData);
  } catch (error) {
    console.error("Erreur dashboard:", error);
    // ✅ Même en cas de timeout/erreur, on affiche quelque chose
    setData({
      stats: null,
      activities: [],
      upcomingProjects: [],
      countries: []
    });
  } finally {
    // ✅ TOUJOURS arrêter le loading après 100ms
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }
}, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 🎯 Mémorisation des icônes (évite re-création)
  const icons = useMemo(() => ({
    users: <Users className="w-6 h-6 text-primary" />,
    userCheck: <UserCheck className="w-6 h-6 text-primary" />,
    folder: <FolderKanban className="w-6 h-6 text-primary" />,
    check: <CheckSquare className="w-6 h-6 text-primary" />
  }), []);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, <span className="text-primary font-medium">{displayName || "Chargement..."}</span>. Voici l'état de votre activité.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-display">Mise à jour des données...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Leads totaux" 
                value={data?.stats?.total_Leads || "0"} 
                change={`+${data?.stats?.new_Leads || 0} nouveaux`} 
                changeType="positive" 
                icon={icons.users} 
              />
              <StatCard 
                title="Clients confirmés" 
                value={data?.stats?.confirmed_clients || "0"} 
                change={`sur ${data?.stats?.total_clients || 0}`} 
                icon={icons.userCheck} 
              />
              <StatCard 
                title="Projets actifs" 
                value={data?.stats?.active_projects || "0"} 
                change={`/${data?.stats?.total_projects || 0} total`} 
                icon={icons.folder} 
              />
              <StatCard 
                title="Tâches en attente" 
                value={data?.stats?.pending_tasks || "0"} 
                change={data?.stats?.overdue_tasks > 0 ? `${data?.stats?.overdue_tasks} en retard` : "À jour"} 
                changeType={data?.stats?.overdue_tasks > 0 ? "negative" : "positive"} 
                icon={icons.check} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-6">Activité récente</h2>
                <div className="space-y-4">
                  {data?.activities.length ? data.activities.map((act: any) => (
                    <div key={act.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`p-2 rounded-lg ${act.type === 'Leads' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>
                        {act.type === 'Leads' ? <Users size={16} /> : <CheckSquare size={16} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{act.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(act.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground italic">Aucune activité récente.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Clock className="w-5 h-5 text-warning" />
                      </div>
                      <h3 className="font-semibold text-foreground">Échéances proches</h3>
                    </div>
                    <button
                      onClick={() => navigate("/dashboard/projects")}
                      className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      Voir tous <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data?.upcomingProjects.length ? data.upcomingProjects.map((p: any, i: number) => {
                      const statusStyles = {
                        overdue: { color: "text-destructive", badge: "🔴 En retard" },
                        urgent: { color: "text-orange-500", badge: "🟠 Urgent" },
                        soon: { color: "text-warning", badge: "🟡 Bientôt" }
                      }[p.level as "overdue" | "urgent" | "soon"];

                      return (
                        <div
                          key={i}
                          onClick={() => navigate("/dashboard/projects")}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium truncate max-w-[120px]">{p.name}</span>
                            <span className={`text-[10px] font-bold uppercase ${statusStyles.color}`}>
                              {statusStyles.badge}
                            </span>
                          </div>
                          <span className={`text-xs font-bold ${statusStyles.color}`}>
                            {new Date(p.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    }) : (
                      <p className="text-xs text-muted-foreground italic">Aucune échéance critique.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;