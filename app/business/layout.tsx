import { AppShell } from "@/components/AppShell";
import { BusinessNav } from "./BusinessNav";

export const metadata = { title: "Business — Trackz" };

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="business" subtitle="Clients, projets, factures">
      <BusinessNav />
      {children}
    </AppShell>
  );
}
