import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { Camera, Loader2, LockKeyhole, Moon, Save, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const { profile, loading: profileLoading } = useProfile();
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    setProfileForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
    });
  }, [profile?.first_name, profile?.last_name, profile?.phone]);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Impossible d'enregistrer vos infos : " + error.message);
      setSavingProfile(false);
      return;
    }


    toast.success("Vos informations ont été mises à jour");
    setSavingProfile(false);
    window.location.reload();
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Veuillez remplir tous les champs du mot de passe.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }

    setChangingPassword(true);

    try {
      // Vérifier le mot de passe actuel avant de le changer
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;
      if (!email) throw new Error("Session introuvable. Veuillez vous reconnecter.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Mot de passe actuel incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || "Échec de mise à jour du mot de passe.");
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      toast.success("Mot de passe mis à jour avec succès.");
    } catch (error: any) {
      toast.error(error?.message || "Impossible de modifier le mot de passe.");
    } finally {
      setChangingPassword(false);
    }
  };

  // Gestion du Thème (Noir ou Blanc)
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Gestion de l'upload de photo
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      // On crée un nom de fichier unique basé sur l'ID utilisateur
      const filePath = `${profile?.id}/${Math.random()}.${fileExt}`;

      // 1. Upload vers le bucket "avatar" (ton bucket Supabase)
      const { error: uploadError } = await supabase.storage
        .from('avatar') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Mise à jour de l'URL dans la table 'profiles'
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', profile?.id);

      if (updateError) throw updateError;
      
      toast.success("Photo de profil mise à jour !");
      // On recharge la page pour rafraîchir l'affichage partout
      window.location.reload();
    } catch (error: any) {
      toast.error("Erreur d'upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Récupération de l'URL publique de l'image
  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      const { data } = supabase.storage.from('avatar').getPublicUrl(profile.avatar_url);
      return data.publicUrl;
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Gérez vos infos personnelles et l'apparence de l'application</p>
        </div>

        <div className="grid gap-6">
          {/* Section Profil : Editable */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Mes informations</CardTitle>
              <CardDescription>Vos informations personnelles sont modifiables ici.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                    {getAvatarUrl() ? (
                      <img src={getAvatarUrl()!} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{profile?.first_name} {profile?.last_name}</h3>
                  <p className="text-muted-foreground capitalize">{profile?.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Prénom</Label>
                  <Input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nom</Label>
                  <Input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Téléphone</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile || profileLoading} className="gap-2">
                    <Save className="w-4 h-4" />
                    {savingProfile ? "Enregistrement..." : "Enregistrer mes infos"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>Changez votre mot de passe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Mot de passe actuel</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Nouveau mot de passe</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Confirmer le nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-2">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <LockKeyhole className="w-4 h-4" />}
                  {changingPassword ? "Mise à jour..." : "Modifier mon mot de passe"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section Thème : Noir ou Blanc */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Apparence du site</CardTitle>
              <CardDescription>Choisissez le mode qui vous convient le mieux.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    {theme === "light" ? <Sun className="w-6 h-6 text-orange-500" /> : <Moon className="w-6 h-6 text-primary" />}
                  </div>
                  <div>
                    <p className="font-bold">Mode {theme === "light" ? "Clair" : "Sombre"}</p>
                    <p className="text-sm text-muted-foreground">Activer le thème {theme === "light" ? "sombre" : "clair"}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  variant="outline"
                  className="shadow-sm"
                >
                  Passer en mode {theme === "light" ? "Sombre" : "Clair"}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;