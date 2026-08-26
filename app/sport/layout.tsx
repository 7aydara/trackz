import { AppShell } from "@/components/AppShell";
import { SportNav } from "./SportNav";

export const metadata = { title: "Kung Fu Shaolin — Trackz" };

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="sport" subtitle="Entrainement a la maison">
      <SportNav />
      {children}
    </AppShell>
  );
}
