"use client";

const PRESETS = [
  "✨", "🔥", "💧", "📖", "🧘", "🏃", "🥗", "😴", "🎧", "🧹",
  "💻", "📝", "🌱", "☀️", "🌙", "💊", "🎸", "🧠", "📵", "💪",
];

/** Choix rapide d'emoji + saisie libre, pour identifier chaque ligne d'un coup d'oeil. */
export function EmojiPicker({
  value,
  onChange,
  presets = PRESETS,
}: {
  value: string;
  onChange: (emoji: string) => void;
  presets?: string[];
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`grid size-10 place-items-center rounded-xl border text-xl transition ${
              value === e
                ? "border-accent bg-accent-soft"
                : "border-hair bg-card hover:border-accent"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 4))}
        aria-label="Emoji personnalise"
        className="mt-2 w-20 rounded-xl border border-hair bg-card px-3 py-2 text-center text-xl outline-none focus:border-accent"
      />
    </div>
  );
}
