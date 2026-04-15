import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

// ✅ PAGES PUBLIQUES - Chargement immédiat (critiques)
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Index from "./pages/Index";

// ✅ PAGES DASHBOARD - Lazy loading (ne charge que quand nécessaire)
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Leads = lazy(() => import("./pages/dashboard/Leads"));
const Clients = lazy(() => import("./pages/dashboard/Clients"));
const Projects = lazy(() => import("./pages/dashboard/Projects"));
const Tasks = lazy(() => import("./pages/dashboard/Tasks"));
const CalendarPage = lazy(() => import("./pages/dashboard/CalendarPage"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const Users = lazy(() => import("./pages/dashboard/Users"));
const Collaboration = lazy(() => import("./pages/dashboard/Collaboration"));
const Quotes = lazy(() => import("./pages/dashboard/Quotes"));
const Invoices = lazy(() => import("./pages/dashboard/Invoices"));
const Recruitment = lazy(() => import("./pages/dashboard/Recruitment"));

// ─── Loading Fallback ────────────────────────────────────────────────────────
const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-background">
    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
    <p className="text-sm text-muted-foreground font-medium">Chargement...</p>
  </div>
);

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
      staleTime: 10 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
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
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard Routes — protégées */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/dashboard/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/dashboard/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/dashboard/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/dashboard/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/dashboard/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/dashboard/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
            <Route path="/dashboard/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
            <Route path="/dashboard/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/dashboard/recruitment" element={<ProtectedRoute><Recruitment /></ProtectedRoute>} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;