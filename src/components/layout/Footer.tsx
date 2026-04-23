import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

// ─── MCE Logo SVG ───────────────────────────────────────────────────────────
const MCELogoFooter = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    {([[20,4],[26,5],[32,9],[36,15],[38,20],[36,25],[32,31],[26,35],[20,36],[14,35],[8,31],[4,25],[2,20],[4,15],[8,9],[14,5]] as [number,number][]).map(([cx,cy],i) => (
      <circle key={`o${i}`} cx={cx} cy={cy} r={1.6} fill={i%3===0?"#00AEEF":"#60D0F8"} />
    ))}
    {([[20,10],[27,13],[30,20],[27,27],[20,30],[13,27],[10,20],[13,13]] as [number,number][]).map(([cx,cy],i) => (
      <circle key={`i${i}`} cx={cx} cy={cy} r={1.2} fill={i%2===0?"#00AEEF":"#60D0F8"} />
    ))}
    <circle cx={20} cy={20} r={1.8} fill="#0A6EBD" />
    <text x="20" y="23" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="white" fontFamily="sans-serif">MCE</text>
  </svg>
);

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { label: "À propos", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Carrières", href: "#careers" },
      { label: "Contact", href: "#contact" },
    ],
    legal: [
      { label: "Politique de confidentialité", href: "#privacy" },
      { label: "Conditions d'utilisation", href: "#terms" },
      { label: "Politique de cookies", href: "#cookies" },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  ];

  const products = [
    { label: "Tableau de bord" },
    { label: "Leads" },
    { label: "Clients" },
    { label: "Projets" },
  ];

  return (
    <footer className="relative bg-slate-950/95 backdrop-blur-xl border-t border-primary/20 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00AEEF] via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg">
                <MCELogoFooter size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">MCE</h3>
                <p className="text-xs text-slate-400">Agency</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
              Gérez vos Leads, clients et projets en toute simplicité depuis une seule plateforme. Optimisez votre productivité et développez votre activité avec MCE Agency.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-400 hover:text-[#00AEEF] transition-colors">
                <MapPin className="w-4 h-4 text-[#00AEEF] flex-shrink-0" />
                <span>Dakar, Plateau - Sénégal</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400 hover:text-[#00AEEF] transition-colors">
                <Phone className="w-4 h-4 text-[#00AEEF] flex-shrink-0" />
                <a href="tel:+221781839973">+221 78 183 99 73</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400 hover:text-[#00AEEF] transition-colors">
                <Mail className="w-4 h-4 text-[#00AEEF] flex-shrink-0" />
                <a href="mailto:mceproagency@gmail.com">mceproagency@gmail.com</a>
              </div>
            </div>
          </div>

          {/* Product Section - NO LINKS */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-white">Produit</h4>
            <ul className="space-y-3">
              {products.map((product, idx) => (
                <li key={idx} className="text-sm text-slate-400">
                  {product.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-white">Entreprise</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-[#00AEEF] transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-white">Légal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-[#00AEEF] transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800/50 my-12" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <div className="text-center md:text-left text-sm text-slate-500">
            <p>
              © {currentYear} MCE Agency. Tous droits réservés. | NINEA: 12345678 9A2
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-[#00AEEF] hover:text-white transition-all duration-200"
                  title={social.label}
                  aria-label={social.label}
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Système opérationnel</span>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00AEEF]/5 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl opacity-20" />
      </div>
    </footer>
  );
};

export default Footer;
