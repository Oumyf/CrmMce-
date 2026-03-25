import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, FolderKanban, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

const StatCard = ({ icon, value, label }: StatCardProps) => (
  <div className="flex flex-col items-center p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-white/15 hover:scale-105">
    <div className="p-3 rounded-xl bg-[#00AEEF]/20 text-[#00AEEF] mb-3">
      {icon}
    </div>
    <span className="text-4xl font-bold font-display text-white mb-1">{value}</span>
    <span className="text-sm text-white/70">{label}</span>
  </div>
);

// MCE Globe Logo — reproduces the dotted-globe look from the brand mark
const MCEGlobeLogo = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-md"
  >
    {/* Globe circle dots pattern */}
    {[
      [20, 4], [26, 5], [32, 9], [36, 15], [38, 20], [36, 25], [32, 31],
      [26, 35], [20, 36], [14, 35], [8, 31], [4, 25], [2, 20], [4, 15],
      [8, 9], [14, 5],
      // Inner ring
      [20, 10], [27, 13], [30, 20], [27, 27], [20, 30], [13, 27], [10, 20], [13, 13],
      // Center
      [20, 20],
      // Meridians
      [20, 4], [20, 36], [2, 20], [38, 20],
    ].map(([cx, cy], i) => (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={i < 16 ? 1.6 : i < 24 ? 1.2 : 1.8}
        fill={i % 3 === 0 ? "#00AEEF" : "#60D0F8"}
        opacity={0.85 + (i % 4) * 0.05}
      />
    ))}
    {/* MCE text inside */}
    <text
      x="20"
      y="23"
      textAnchor="middle"
      fontSize="7"
      fontWeight="bold"
      fill="white"
      fontFamily="sans-serif"
      letterSpacing="0.5"
    >
      MCE
    </text>
  </svg>
);

export const Hero = () => {
  const stats = {
    employees: 12,
    projects: 48,
    poles: 4,
  };

  return (
    <section
      className="hero-section min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0A1F44 0%, #0D3A6E 40%, #0A6EBD 75%, #00AEEF 100%)",
      }}
    >
      {/* Animated background grid / dots */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle, #00AEEF 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-3">
          <MCEGlobeLogo />
          <span
            className="text-xl font-bold text-white tracking-wide"
            style={{ fontFamily: "'Segoe UI', sans-serif", letterSpacing: "0.05em" }}
          >
            MCE{" "}
            <span className="text-[#00AEEF] font-light">Agency</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button
              variant="ghost"
              className="text-white/90 hover:text-white hover:bg-white/10 border border-white/20"
            >
              Connexion
            </Button>
          </Link>
          <Link to="/register">
            <Button
              className="bg-[#00AEEF] hover:bg-[#0096CC] text-white font-semibold px-6 py-2 rounded-xl shadow-lg shadow-[#00AEEF]/30 transition-all duration-300"
            >
              Inscription
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-12 pb-20">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-[#00AEEF]/40 text-white/90 text-sm mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#00AEEF] animate-pulse" />
            Plateforme de gestion d'agence
          </div>

          {/* Heading */}
          <h1
            className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "'Segoe UI', sans-serif" }}
          >
            Gérez votre agence
            <span
              className="block"
              style={{
                background: "linear-gradient(90deg, #00AEEF, #60D0F8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              en toute simplicité
            </span>
          </h1>

          <p className="text-lg lg:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Centralisez vos Leads, clients, projets et équipes dans une seule plateforme.
            Optimisez votre productivité et développez votre activité avec{" "}
            <span className="text-[#00AEEF] font-semibold">MCE Agency</span>.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register">
              <button
                className="group flex items-center gap-2 bg-[#00AEEF] hover:bg-[#0096CC] text-white font-semibold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-[#00AEEF]/40 transition-all duration-300 hover:scale-105"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link to="/showcase">
              <button
                className="flex items-center gap-2 bg-transparent border-2 border-white/30 hover:border-[#00AEEF] text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                Voir nos réalisations
              </button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            value={stats.employees.toString()}
            label="Employés"
          />
          <StatCard
            icon={<FolderKanban className="w-6 h-6" />}
            value={stats.projects.toString()}
            label="Projets"
          />
          <StatCard
            icon={<Building2 className="w-6 h-6" />}
            value={stats.poles.toString()}
            label="Pôles"
          />
        </div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-[#00AEEF]/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-[#0A6EBD]/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0D3A6E]/20 rounded-full blur-[100px] pointer-events-none" />
    </section>
  );
};
