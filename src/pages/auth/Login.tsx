import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
            <MCELogoBeautiful size={56} />
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
        Connectez-vous à votre compte
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

const Login = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const isDeletedProfile = (profile: any) => String(profile?.role ?? "").toLowerCase() === "deleted";

  // ─── Prefetch données du dashboard ──
  const prefetchDashboardData = async (userId: string) => {
    try {
      // Prefetch le profil utilisateur
      await queryClient.prefetchQuery({
        queryKey: ["profile"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          if (error) throw error;
          return data;
        },
      });

      // Prefetch les notifications
      await queryClient.prefetchQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("profile_id", userId)
            .order("created_at", { ascending: false })
            .limit(15);
          if (error) throw error;
          return data;
        },
      });

      // Prefetch les projets (optionnel mais rapide)
      await queryClient.prefetchQuery({
        queryKey: ["projects"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return data;
        },
      });

      // Prefetch les leads
      await queryClient.prefetchQuery({
        queryKey: ["leads"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("leads")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return data;
        },
      });

      // Prefetch les clients
      await queryClient.prefetchQuery({
        queryKey: ["clients"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return data;
        },
      });
    } catch (error) {
      console.warn("Erreur prefetch:", error);
      // On ignore les erreurs, le dashboard chargera les données si besoin
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Connexion
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          throw new Error("Email ou mot de passe incorrect");
        }
        throw error;
      }

      if (data.user) {
        const { data: loginProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (loginProfile && isDeletedProfile(loginProfile)) {
          await supabase.auth.signOut();
          throw new Error("Votre compte a été supprimé. Contactez un administrateur.");
        }

        toast.success("Content de vous revoir !");

        // ✅ PREFETCH les données AVANT de rediriger
        // Ça va charger tout en arrière-plan pendant que l'utilisateur attend
        await prefetchDashboardData(data.user.id);

        // Puis redirection (les données sont déjà en cache!)
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue lors de la connexion");
      console.error("Erreur de connexion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-20 py-12">
        <div className="w-full max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              Bon retour parmi nous
            </h1>
            <p className="text-muted-foreground">
              Connectez-vous à votre compte pour continuer
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votremail@exemple.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours...
                </div>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-muted-foreground">
            Pas encore de compte?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Beautiful MCE Agency Section */}
      <MCEAgencySection />
    </div>
  );
};

export default Login;
