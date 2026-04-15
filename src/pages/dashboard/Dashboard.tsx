import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import {
  CheckSquare,
  Clock,
  FolderKanban,
  Loader2,
  UserCheck,
  Users
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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

    // ✅ Timeout de 10 secondes pour éviter le blocage infini
    const fetchPromise = Promise.all([
      supabase.from('dashboard_stats').select('*').single(),
      supabase.from('recent_activity').select('id, type, message, created_at').limit(6).order('created_at', { ascending: false }),
      supabase.from('projects')
        .select('name, deadline')
        .eq('status', 'en_cours')
        .not('deadline', 'is', null)
        .order('deadline', { ascending: true }),
      supabase.from('clients').select('country')
    ]);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Dashboard timeout')), 10000)
    );

    const [statsRes, activityRes, projectsRes, countryRes] = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]) as any;

    const today = new Date();
    const next3 = new Date();
    next3.setDate(today.getDate() + 3);
    const next7 = new Date();
    next7.setDate(today.getDate() + 7);

    const categorized = (projectsRes.data || [])
      .filter((p: any) => new Date(p.deadline) <= next7)
      .map((p: any) => {
        const deadline = new Date(p.deadline);
        let level = "soon";
        if (deadline < today) level = "overdue";
        else if (deadline <= next3) level = "urgent";
        return { ...p, level };
      });

    const countryCounts = (countryRes.data || []).reduce((acc: any, curr: any) => {
      const country = curr.country || "Non défini";
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    const formattedCountries = Object.keys(countryCounts)
      .map(key => ({ country: key, count: countryCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const newData = {
      stats: statsRes.data,
      activities: activityRes.data || [],
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
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <h3 className="font-semibold text-foreground">Échéances proches</h3>
                  </div>

                  <div className="space-y-3">
                    {data?.upcomingProjects.length ? data.upcomingProjects.map((p: any, i: number) => {
                      const statusStyles = {
                        overdue: { color: "text-destructive", badge: "🔴 En retard" },
                        urgent: { color: "text-orange-500", badge: "🟠 Urgent" },
                        soon: { color: "text-warning", badge: "🟡 Bientôt" }
                      }[p.level as "overdue" | "urgent" | "soon"];

                      return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-all">
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