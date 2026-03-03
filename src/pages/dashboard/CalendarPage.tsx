import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths
} from "date-fns";
import { fr } from "date-fns/locale";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  type: "task" | "deadline" | "reminder";
  project_id?: string;
  is_overdue: boolean;
  reminder_time_before: number;
}

const eventTypeColors = {
  task: "bg-blue-50 text-blue-700 border-blue-200",
  deadline: "bg-red-50 text-red-700 border-red-200",
  reminder: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function CalendarPage() {

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [overdueEvents, setOverdueEvents] = useState<CalendarEvent[]>([]);
  const [showOverduePopup, setShowOverduePopup] = useState(false);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);

  const maintenant = new Date();
  const uneSemaineAvant = subDays(maintenant, 7);

  const historiqueRecent = events.filter(event => {
    const dateEvent = new Date(event.start_date);
    return isAfter(dateEvent, uneSemaineAvant) && isBefore(dateEvent, maintenant);
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: "task" as const,
    project_id: "none",
    reminder_before: "0"
  });

  useEffect(() => {
    fetchData();
    checkGoogleConnection();
  }, [currentDate]);

  const checkGoogleConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_google_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    setGoogleConnected(!!data);
    setCheckingGoogle(false);
  };

 const connectGoogle = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Vous devez être connecté");
      return;
    }

    const { data, error } = await supabase.functions.invoke("google-auth");

    if (error) throw error;

    if (data?.url) {
      window.location.href = data.url;
    }

  } catch (err: any) {
    console.error(err);
    toast.error("Erreur connexion Google");
  }
};

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: evData } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id);

    const { data: prData } = await supabase
      .from("projects")
      .select("id, name");

    if (prData) setProjects(prData);

    if (evData) {
      const now = new Date();
      const enriched = evData.map(e => ({
        ...e,
        is_overdue: isBefore(new Date(e.start_date), now) && e.type === "deadline"
      }));

      setEvents(enriched);

      const overdue = enriched.filter(e => e.is_overdue);
      if (overdue.length > 0) {
        setOverdueEvents(overdue);
        setShowOverduePopup(true);
      }
    }
  };

  const handleAddEvent = async () => {
    if (!formData.title) return toast.error("Le titre est requis");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: insertedEvent, error } = await supabase
        .from("calendar_events")
        .insert([{
          title: formData.title,
          description: formData.description,
          start_date: formData.date,
          type: formData.type,
          project_id: formData.project_id === "none" ? null : formData.project_id,
          user_id: user.id,
          reminder_time_before: parseInt(formData.reminder_before)
        }])
        .select()
        .single();

      if (error) throw error;

      if (googleConnected) {
        await supabase.functions.invoke("google-create-event", {
          body: { event: insertedEvent },
        });
      }

      toast.success("Événement ajouté avec succès");

      setIsModalOpen(false);
      fetchData();

      setFormData({
        title: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        type: "task",
        project_id: "none",
        reminder_before: "0"
      });

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Popup Retards */}
        <Dialog open={showOverduePopup} onOpenChange={setShowOverduePopup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle /> Échéances dépassées
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {overdueEvents.map(e => (
                <div key={e.id} className="p-3 bg-red-50 border rounded-md flex justify-between items-center">
                  <span className="font-medium text-sm">{e.title}</span>
                  <Badge variant="destructive">Retard</Badge>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowOverduePopup(false)}>Fermer</Button>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
            <p className="text-muted-foreground">Gérez vos tâches et deadlines projets.</p>
          </div>

          <div className="flex items-center gap-3">

            {!checkingGoogle && (
              googleConnected ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-green-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Google connecté
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={connectGoogle}
                  className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Calendar className="w-4 h-4" />
                  Connecter Google
                </Button>
              )
            )}

            <div className="flex bg-card border rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-1 font-semibold min-w-[140px] text-center capitalize">
                {format(currentDate, "MMMM yyyy", { locale: fr })}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => (
              <div key={d} className="p-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.start_date), day));
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  className={`min-h-[140px] border-r border-b p-2 transition-colors hover:bg-muted/10 ${!isSameMonth(day, currentDate) ? "bg-muted/5 opacity-40" : ""}`}
                >
                  <div className={`text-sm font-semibold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                    {format(day, "d")}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`group relative p-1.5 rounded-md border text-[10px] font-medium truncate cursor-pointer transition-shadow hover:shadow-sm ${eventTypeColors[event.type]}`}
                      >
                        <div className="flex items-center gap-1">
                          {event.is_overdue && <AlertTriangle className="w-3 h-3 text-red-600" />}
                          {event.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}