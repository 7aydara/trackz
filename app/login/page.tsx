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
        <div className="mb-6 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-accent text-3xl shadow-lg">
            🗂️
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Trackz</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            Un compte, cinq apps : habitudes, cours, ecoles, business, Kung Fu.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
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
