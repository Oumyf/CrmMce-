import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CalendarPage from "./pages/dashboard/CalendarPage";
import Clients from "./pages/dashboard/Clients";
import Collaboration from "./pages/dashboard/Collaboration";
import Dashboard from "./pages/dashboard/Dashboard";
import Invoices from "./pages/dashboard/Invoices";
import Leads from "./pages/dashboard/Leads";
import Projects from "./pages/dashboard/Projects";
import Quotes from "./pages/dashboard/Quotes";
import Recruitment from "./pages/dashboard/Recruitment";
import Settings from "./pages/dashboard/Settings";
import Tasks from "./pages/dashboard/Tasks";
import Index from "./pages/Index";

// ─── NotFound Page ───────────────────────────────────────────────────────────
const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-screen">
    <h1 className="text-2xl font-bold">Page non trouvée</h1>
    <Link to="/dashboard" className="mt-4 text-primary hover:underline">
      Retour au tableau de bord
    </Link>
  </div>
);

// ─── Optimized QueryClient Configuration ─────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ CACHE : Garder les données en cache pendant 10 minutes
      staleTime: 10 * 60 * 1000, // 10 minutes
      
      // ✅ MEMORY : Garder les données en mémoire pendant 15 minutes après la dernière utilisation
      gcTime: 15 * 60 * 1000, // Ancien "cacheTime"
      
      // ✅ REFETCH : Refetch au focus de la fenêtre si données stale
      refetchOnWindowFocus: true,
      
      // ✅ REFETCH : Refetch au remontage du composant si données stale
      refetchOnMount: true,
      
      // ✅ REFETCH : Refetch à la reconnexion réseau si données stale
      refetchOnReconnect: true,
      
      // ✅ RETRY : Réessayer 2 fois en cas d'erreur (au lieu de 3)
      retry: 2,
      
      // ✅ RETRY DELAY : Attendre 1 seconde entre les tentatives
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // ✅ Réessayer 1 fois en cas d'erreur
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// ─── App Component ──────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/leads" element={<Leads />} />
          <Route path="/dashboard/clients" element={<Clients />} />
          <Route path="/dashboard/projects" element={<Projects />} />
          <Route path="/dashboard/tasks" element={<Tasks />} />
          <Route path="/dashboard/calendar" element={<CalendarPage />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/collaboration" element={<Collaboration />} />
          <Route path="/dashboard/quotes" element={<Quotes />} />
          <Route path="/dashboard/invoices" element={<Invoices />} />
          <Route path="/dashboard/recruitment" element={<Recruitment />} />

          {/* 404 Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
