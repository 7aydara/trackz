import { AppShell } from "@/components/AppShell";
import { formatLong, todayISO } from "@/lib/dates";

export const metadata = { title: "Habit Tracker — Trackz" };

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="tracker" subtitle={formatLong(todayISO())}>
      {children}
    </AppShell>
  );
}
