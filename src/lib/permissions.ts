export type AppModule =
  | "clients"
  | "leads"
  | "projects"
  | "tasks"
  | "collaboration"
  | "quotes"
  | "invoices"
  | "recruitment";

const deletePermissions: Record<string, AppModule[]> = {
  superadmin: ["clients","leads","projects","tasks","collaboration","quotes","invoices","recruitment"],
  admin: ["projects", "quotes", "invoices", "recruitment"],
  administrateur: ["projects", "quotes", "invoices", "recruitment"],
};

export function canDelete(role: string | null | undefined, module: AppModule): boolean {
  const normalized = String(role || "").toLowerCase();
  const allowed = deletePermissions[normalized];
  if (!allowed) return false;
  return allowed.includes(module);
}

export function isAdminOrAbove(role: string | null | undefined): boolean {
  const normalized = String(role || "").toLowerCase();
  return ["admin", "administrateur", "superadmin"].includes(normalized);
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return String(role || "").toLowerCase() === "superadmin";
}