import { AppShell } from "@/components/AppShell";
import { ChantNav } from "./ChantNav";

export const metadata = { title: "Cours de chant — Trackz" };

export default function ChantLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="chant" subtitle="Apprendre a chanter juste">
      <ChantNav />
      {children}
    </AppShell>
  );
}
