import { Icon } from "@/components/Icon";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion — Trackz" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="theme-tracker grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-[26px] bg-accent text-on-accent shadow-[0_5px_0_var(--color-accent-deep)]">
            <Icon name="check" size={40} strokeWidth={3} />
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-accent-ink">Trackz</h1>
          <p className="mt-2 font-semibold text-muted">
            Un compte, cinq apps : habitudes, cours, ecoles, business, Kung Fu.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-bold text-danger-ink">
            Lien invalide ou expire. Reessaie une connexion.
          </p>
        )}

        <LoginForm next={next} />

        <p className="mt-6 flex flex-wrap justify-center gap-2 text-xl" aria-hidden>
          <span>🔥</span>
          <span>📚</span>
          <span>🎓</span>
          <span>💼</span>
          <span>🥋</span>
        </p>
      </div>
    </div>
  );
}
