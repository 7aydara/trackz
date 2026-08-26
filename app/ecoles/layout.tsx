import { AppShell } from "@/components/AppShell";

export const metadata = { title: "Dossiers ecoles — Trackz" };

export default function EcolesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="ecoles" subtitle="Deadlines, documents, comptes a rebours">
      {children}
    </AppShell>
  );
}
