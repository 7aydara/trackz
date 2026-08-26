import { AppShell } from "@/components/AppShell";

export const metadata = { title: "Cours — Trackz" };

export default function CoursLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="cours" subtitle="Une case par matiere, chaque jour">
      {children}
    </AppShell>
  );
}
