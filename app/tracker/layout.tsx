import { AppShell } from "@/components/AppShell";
import { formatLong } from "@/lib/dates";
import { getToday } from "@/lib/today";

export const metadata = { title: "Habit Tracker — Trackz" };

export default async function TrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell moduleKey="tracker" subtitle={formatLong(await getToday())}>
      {children}
    </AppShell>
  );
}
