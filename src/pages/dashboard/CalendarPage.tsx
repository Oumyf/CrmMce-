import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    type: "task" as "task" | "deadline" | "reminder",
    project_id: "none",
    reminder_before: "0"
  });

  // ── Vérification connexion Google (une seule fois au montage)
  useEffect(() => {
    checkGoogleConnection();
  }, []);

  // ── Fetch données quand le mois change ou quand googleConnected change
  useEffect(() => {
    fetchData();
  }, [currentDate, googleConnected]);

  const checkGoogleConnection = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    const isGoogle =
      session?.user?.app_metadata?.provider === "google" ||
      session?.user?.app_metadata?.providers?.includes("google");

    setGoogleConnected(!!isGoogle && !!session?.provider_token);
    setCheckingGoogle(false);
  };

  const connectGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar",
        redirectTo: `${window.location.origin}/dashboard/calendar`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) toast.error("Erreur connexion Google");
  };

  const fetchGoogleEvents = async (): Promise<CalendarEvent[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;
    if (!token) return [];

    const startOfMonthDate = startOfMonth(currentDate).toISOString();
    const endOfMonthDate = endOfMonth(currentDate).toISOString();

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin: startOfMonthDate,
          timeMax: endOfMonthDate,
          singleEvents: "true",
          orderBy: "startTime",
        }),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) return [];

      const data = await res.json();

      return (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.summary || "Sans titre",
        description: item.description || "",
        start_date: item.start?.dateTime || item.start?.date,
        type: "reminder" as const,
        is_overdue: false,
        reminder_time_before: 0,
      }));
    } catch {
      return [];
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

    const now = new Date();
    const supabaseEvents = (evData || []).map(e => ({
      ...e,
      is_overdue: isBefore(new Date(e.start_date), now) && e.type === "deadline"
    }));

    // ✅ Récupérer les événements Google si connecté
    const googleEvents = googleConnected ? await fetchGoogleEvents() : [];

    // ✅ Merger sans doublons
    const allEvents = [
      ...supabaseEvents,
      ...googleEvents.filter(ge => !supabaseEvents.find(se => se.id === ge.id))
    ];

    setEvents(allEvents);

    const overdue = supabaseEvents.filter(e => e.is_overdue);
    if (overdue.length > 0) {
      setOverdueEvents(overdue);
      setShowOverduePopup(true);
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

      // ✅ Sync Google Calendar si connecté
      if (googleConnected) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.provider_token;

        if (token) {
          await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                summary: insertedEvent.title,
                description: insertedEvent.description,
                start: {
                  dateTime: new Date(insertedEvent.start_date).toISOString(),
                  timeZone: "Africa/Dakar",
                },
                end: {
                  dateTime: new Date(
                    new Date(insertedEvent.start_date).getTime() + 60 * 60 * 1000
                  ).toISOString(),
                  timeZone: "Africa/Dakar",
                },
              }),
            }
          );
        }
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

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création";
      toast.error(message);
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

        {/* Modal Création Événement */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un événement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  placeholder="Titre de l'événement"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="date">Date et heure *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as "task" | "deadline" | "reminder" })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tâche</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="reminder">Rappel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project">Projet</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                  <SelectTrigger id="project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reminder">Rappel avant (minutes)</Label>
                <Input
                  id="reminder"
                  type="number"
                  placeholder="0"
                  value={formData.reminder_before}
                  onChange={(e) => setFormData({ ...formData, reminder_before: e.target.value })}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddEvent}>
                Créer
              </Button>
            </DialogFooter>
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
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
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