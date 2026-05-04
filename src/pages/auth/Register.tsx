import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const roles = [
  { value: "commercial", label: "Commercial" },
  { value: "developer", label: "Développeur" },
  { value: "community_manager", label: "Community Manager" },
];

// ─── MCE Logo SVG Component ──────────────────────────────────────────────
const MCELogoBeautiful = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {/* Outer circle dots */}
    {([[20,4],[26,5],[32,9],[36,15],[38,20],[36,25],[32,31],[26,35],[20,36],[14,35],[8,31],[4,25],[2,20],[4,15],[8,9],[14,5]] as [number,number][]).map(([cx,cy],i) => (
      <circle key={`o${i}`} cx={cx} cy={cy} r={1.6} fill={i%3===0?"#00AEEF":"#60D0F8"} />
    ))}
    {/* Inner ring dots */}
    {([[20,10],[27,13],[30,20],[27,27],[20,30],[13,27],[10,20],[13,13]] as [number,number][]).map(([cx,cy],i) => (
      <circle key={`i${i}`} cx={cx} cy={cy} r={1.2} fill={i%2===0?"#00AEEF":"#60D0F8"} />
    ))}
    {/* Center dot */}
    <circle cx={20} cy={20} r={1.8} fill="#0A6EBD" />
    {/* MCE text */}
    <text x="20" y="23" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">MCE</text>
  </svg>
);

// ─── MCE AGENCY BEAUTIFUL SECTION ────────────────────────────────────────
const MCEAgencySection = () => (
  <div className="hidden lg:flex flex-1 hero-section items-center justify-center p-12 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 overflow-hidden">
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(90deg, #00AEEF 1px, transparent 1px), linear-gradient(#00AEEF 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* Animated blobs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-gradient-to-r from-[#00AEEF]/30 to-[#0A6EBD]/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-gradient-to-l from-[#00AEEF]/20 to-cyan-500/10 rounded-full blur-3xl animate-float" />
      
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#00AEEF]/15 rounded-full blur-[100px] opacity-50" />
    </div>

    {/* Content */}
    <div className="relative z-10 text-center max-w-md">
      {/* Logo Container */}
      <div className="flex justify-center mb-8">
        <div className="relative group">
          {/* Outer glow ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00AEEF] to-cyan-400 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          
          {/* Logo box */}
          <div className="relative w-32 h-32 rounded-3xl bg-white/90 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500 p-2">
            <img src="/mce-logo.png" className="w-full h-full object-contain" alt="MCE" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-4xl lg:text-5xl font-bold mb-3 leading-tight">
        <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
          MCE
        </span>
        <span className="block bg-gradient-to-r from-[#00AEEF] via-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Agency
        </span>
      </h2>

      {/* Subtitle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="h-1 w-8 bg-gradient-to-r from-[#00AEEF] to-transparent rounded-full" />
        <span className="text-sm font-semibold text-[#00AEEF] tracking-widest uppercase">Plateforme CRM</span>
        <div className="h-1 w-8 bg-gradient-to-l from-[#00AEEF] to-transparent rounded-full" />
      </div>

      {/* Description */}
      <p className="text-white/70 text-lg leading-relaxed mb-1">
        Créez votre compte pour rejoindre l'équipe
      </p>
      <p className="text-white/60 text-base">
        et accédez à tous les outils de gestion de l'agence
      </p>

      {/* Feature badges */}
      <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-white/10">
        {[
          { icon: "⚡", label: "Rapide" },
          { icon: "🔒", label: "Sécurisé" },
          { icon: "∞", label: "Scalable" },
        ].map((feature) => (
          <div key={feature.label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 hover:border-[#00AEEF]/50 transition-all">
            <span className="text-lg">{feature.icon}</span>
            <span className="text-xs font-medium text-white/70">{feature.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (!formData.role) {
      toast.error("Veuillez sélectionner un rôle");
      return;
    }

    setIsLoading(true);
    
    try {
      // Inscription : On envoie les données de profil dans options.data
      // Votre TRIGGER SQL s'occupera de créer l'entrée dans la table 'profiles'
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            role: formData.role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const baseProfile = {
          id: data.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: formData.role,
        };

        const withEmail = await supabase
          .from("profiles")
          .upsert({ ...baseProfile, email: formData.email }, { onConflict: "id" });

        if (withEmail.error) {
          const withUserEmail = await supabase
            .from("profiles")
            .upsert({ ...baseProfile, user_email: formData.email }, { onConflict: "id" });
          if (withUserEmail.error) {
            await supabase.from("profiles").upsert(baseProfile, { onConflict: "id" });
          }
        }

        // Si session = null → confirmation email requise (Supabase Email Confirmations activé)
        if (!data.session) {
          setRegisteredEmail(formData.email);
          setEmailSent(true);
        } else {
          toast.success("Inscription réussie !");
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Écran de confirmation email ────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-20 py-12">
          <div className="w-full max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Vérifiez votre email</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Un lien de confirmation a été envoyé à<br />
                <span className="font-semibold text-foreground">{registeredEmail}</span>
              </p>
            </div>
            <div className="bg-muted/50 border rounded-xl p-4 text-sm text-muted-foreground text-left space-y-2">
              <p className="font-medium text-foreground">Comment procéder :</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ouvrez votre boîte mail</li>
                <li>Cliquez sur le lien de confirmation de MCE Agency</li>
                <li>Vous serez redirigé vers votre tableau de bord</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">
              Pas reçu l'email ? Vérifiez vos spams ou{" "}
              <button onClick={() => setEmailSent(false)} className="text-primary hover:underline font-medium">
                réessayez avec une autre adresse
              </button>
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Retour à la connexion
            </Link>
          </div>
        </div>
        <MCEAgencySection />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-20 py-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Créer un compte
            </h1>
            <p className="text-muted-foreground">
              Rejoignez l'équipe et commencez à collaborer
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Fonction</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sélectionner votre fonction" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votremail@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmez votre mot de passe"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Inscription en cours..." : "S'inscrire"}
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            Déjà un compte?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Beautiful MCE Agency Section */}
      <MCEAgencySection />
    </div>
  );
};

export default Register;
