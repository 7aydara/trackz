import type { ReactNode } from "react";

/**
 * Rendu leger du markdown que renvoie l'assistant : gras, liens, listes.
 * Construit des elements React — jamais de `dangerouslySetInnerHTML`, le
 * texte vient d'un modele et peut contenir n'importe quoi.
 */

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className="rounded bg-sunk px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const href = link[2];
      const safe = href.startsWith("http://") || href.startsWith("https://");
      if (!safe) return <span key={key}>{link[1]}</span>;
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="font-bold text-accent-ink underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key} className="my-1 space-y-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-[2px] text-accent">
              •
            </span>
            <span>{renderInline(b, `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed) ?? /^\d+\.\s+(.*)$/.exec(trimmed);

    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flushBullets(`ul-${i}`);

    if (!trimmed) return;

    const heading = /^#{1,4}\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push(
        <p key={i} className="mt-2 font-extrabold">
          {renderInline(heading[1], `h-${i}`)}
        </p>,
      );
      return;
    }

    blocks.push(<p key={i}>{renderInline(trimmed, `p-${i}`)}</p>);
  });

  flushBullets("ul-end");

  return <div className="space-y-1.5">{blocks}</div>;
}
