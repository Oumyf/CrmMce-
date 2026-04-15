import { AuthProvider } from "@/context/AuthContext";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Marqueur de version — permet de confirmer que le nouveau build est déployé
console.log("%c[MCE CRM] Build: 27e2743 — " + new Date().toISOString(), "color: #00AEEF; font-weight: bold");

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
