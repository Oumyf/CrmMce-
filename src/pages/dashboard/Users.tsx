import { DashboardLayout, formatRole } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoryPanel } from "@/components/shared/HistoryPanel";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { History as HistoryIcon, KeyRound, Search, Trash2, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ManagedUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  isDeleted: boolean;
};

const getUserEmail = (profile: any): string | null => {
  return profile.email ?? profile.user_email ?? profile.email_address ?? null;
};

const getDeletionState = (profile: any): boolean =>
  String(profile.role ?? "").toLowerCase() === "deleted";

const Users = () => {
  const { profile, isAdmin, isSuperAdmin } = useProfile();
  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [resetLoadingId, setResetLoadingId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Impossible de charger les utilisateurs : " + error.message);
      setUsersLoading(false);
      return;
    }

    const mapped: ManagedUser[] = (data || []).map((u: any) => ({
      id: u.id,
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      role: u.role ?? null,
      phone: u.phone ?? null,
      email: getUserEmail(u),
      isDeleted: getDeletionState(u),
    }));

    setUsers(mapped);
    setUsersLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim().toLowerCase();
      const mail = (u.email ?? "").toLowerCase();
      const phone = (u.phone ?? "").toLowerCase();

      const matchesSearch =
        !userSearch ||
        fullName.includes(userSearch.toLowerCase()) ||
        mail.includes(userSearch.toLowerCase()) ||
        phone.includes(userSearch.toLowerCase());

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !u.isDeleted) ||
        (statusFilter === "deleted" && u.isDeleted);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  const activeUsers = filteredUsers.filter((u) => !u.isDeleted);
  const deletedUsers = filteredUsers.filter((u) => u.isDeleted);
  const visibleUsers = showDeletedUsers ? deletedUsers : activeUsers;

  // ── Suppression soft d'un utilisateur ────────────────────────────────────
  const deleteUserSafely = async (targetUserId: string) => {
    if (targetUserId === profile?.id) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    // Empêcher la suppression d'un superadmin par un admin normal
    const targetUser = users.find((u) => u.id === targetUserId);
    if (targetUser?.role === "superadmin" && !isSuperAdmin) {
      toast.error("Seul un superadmin peut supprimer un autre superadmin.");
      return;
    }

    const previousUsers = users;
    setUsers((current) =>
      current.map((user) =>
        user.id === targetUserId
          ? {
              ...user,
              first_name: "Utilisateur",
              last_name: "supprime",
              phone: null,
              role: "deleted",
              isDeleted: true,
            }
          : user
      )
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: "Utilisateur",
        last_name: "supprime",
        phone: null,
        role: "deleted",
      })
      .eq("id", targetUserId);

    if (error) {
      setUsers(previousUsers);
      toast.error("Échec de la suppression utilisateur: " + error.message);
      return;
    }

    toast.success("Utilisateur supprimé (historique conservé)");
  };

  // ── Envoi de lien de réinitialisation (superadmin uniquement) ────────────
  const sendPasswordReset = async (targetEmail: string, targetId: string) => {
    if (!targetEmail) {
      toast.error("Cet utilisateur n'a pas d'email renseigné.");
      return;
    }

    setResetLoadingId(targetId);
    try {
      const { error } = await supabase.functions.invoke("send-password-reset", {
        body: { email: targetEmail },
      });

      if (error) throw error;

      toast.success(`Lien de réinitialisation envoyé à ${targetEmail}`);
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Impossible d'envoyer le lien"));
    } finally {
      setResetLoadingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        <div className="rounded-2xl border bg-gradient-to-r from-card via-card to-slate-50/80 p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Utilisateurs</h1>
              <p className="text-muted-foreground mt-1">
                Gérez les membres de l'entreprise et consultez les anciens membres.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="gap-2">
                <HistoryIcon className="w-4 h-4" /> Historique
              </Button>
              <Button variant="outline" onClick={loadUsers} className="gap-2">
                <Users2 className="w-4 h-4" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Liste des membres</CardTitle>
            <CardDescription>Tableau de suivi des utilisateurs actifs et supprimés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Rechercher nom, email, téléphone"
                  className="pl-9"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="developer">Développeur</SelectItem>
                  <SelectItem value="community_manager">Community Manager</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="deleted">Supprimés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">Total: {users.length}</Badge>
              <Badge variant="secondary">Actifs: {users.filter((u) => !u.isDeleted).length}</Badge>
              <Badge variant="secondary">Supprimés: {users.filter((u) => u.isDeleted).length}</Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {showDeletedUsers ? "Affichage des anciens membres" : "Affichage des membres actifs"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeletedUsers((prev) => !prev)}
                className="gap-2"
              >
                <Users2 className="w-4 h-4" />
                {showDeletedUsers ? "Voir les membres actifs" : "Voir les anciens membres"}
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((u) => (
                    <TableRow key={u.id} className={u.isDeleted ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        {`${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "Utilisateur"}
                      </TableCell>
                      <TableCell>{u.email || "Email non renseigné"}</TableCell>
                      <TableCell>{u.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            u.role === "superadmin" && "border-amber-500 text-amber-600 bg-amber-50"
                          )}
                        >
                          {formatRole(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isDeleted ? "destructive" : "secondary"}>
                          {u.isDeleted ? "Supprimé" : "Actif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!u.isDeleted ? (
                          <div className="flex items-center justify-end gap-2">
                            {/* Bouton reset password — superadmin uniquement */}
                            {isSuperAdmin && u.id !== profile?.id && u.email && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => sendPasswordReset(u.email!, u.id)}
                                disabled={resetLoadingId === u.id}
                                className="gap-2"
                                title="Envoyer un lien de réinitialisation"
                              >
                                <KeyRound className="w-4 h-4" />
                                {resetLoadingId === u.id ? "Envoi..." : "Reset MDP"}
                              </Button>
                            )}

                            {/* Bouton supprimer */}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUserSafely(u.id)}
                              disabled={
                                u.id === profile?.id ||
                                usersLoading ||
                                (u.role === "superadmin" && !isSuperAdmin)
                              }
                              className="gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground bg-muted/40">
                            Ancien membre
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun utilisateur à afficher.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {usersLoading && (
              <div className="p-4 text-sm text-muted-foreground">Chargement des utilisateurs...</div>
            )}
          </CardContent>
        </Card>
      </div>

      <HistoryPanel
        entityType="profile"
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Historique des utilisateurs"
      />
    </DashboardLayout>
  );
};

export default Users;