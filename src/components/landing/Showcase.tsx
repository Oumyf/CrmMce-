import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface ShowcaseProject {
  id: string;
  name: string;
  image: string;
  url: string;
  status: "realise" | "en_cours" | "a_venir" | "signe" | "refus" | "rappeler";
}

const statusConfig = {
  realise: { label: "Réalisé", className: "bg-success/10 text-success border-success/20" },
  en_cours: { label: "En cours", className: "bg-info/10 text-info border-info/20" },
  a_venir: { label: "À venir", className: "bg-warning/10 text-warning border-warning/20" },
  signe: { label: "Signé", className: "bg-primary/10 text-primary border-primary/20" },
  refus: { label: "Refusé", className: "bg-destructive/10 text-destructive border-destructive/20" },
  rappeler: { label: "À rappeler", className: "bg-muted text-muted-foreground border-muted" },
};


  
 // Données de démonstration
const projects: ShowcaseProject[] = [
  {
    id: "1",

    name: "Teranga-express",
    image: "/images/dashboard-1.png",
    url: "https://teranga-express.com/",

  

    status: "realise",
  },
  {
    id: "2",

    name: "panafricacreperie",
    image: "/images/dashboard-2.png",
    url: "https://panafricacreperie.com/",

   

    status: "realise",
  },
  {
    id: "3",

    name: "lehainnov",
    image: "/images/dashboard-3.png",
    url: "https://lehainnov.com/",
    status: "realise",
  },
  {
    id: "4",
    name: "AMANYA",
    image: "/images/dashboard-4.png",
    url: "https://moda-sn.com/",
    status: "realise",

  },
  
];

export const Showcase = () => {
  return (
    <section className="py-24 px-6 lg:px-12 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Nos Réalisations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les projets que nous avons réalisés pour nos clients
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map((project) => (
            <a
              key={project.id}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={project.image}
                  alt={project.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-20">
                <div className="flex items-center gap-2 text-background font-medium">
                  <span>Voir le site</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                  <Badge variant="outline" className={statusConfig[project.status].className}>
                    {statusConfig[project.status].label}
                  </Badge>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
