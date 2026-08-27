import type { SVGProps } from "react";

/**
 * Jeu d'icones inline, trace a 2px avec des terminaisons rondes pour
 * repondre a la geometrie arrondie du reste de l'interface.
 *
 * Volontairement en SVG plutot qu'en police d'icones : une police qui ne
 * charge pas affiche le nom du glyphe en toutes lettres (c'est le bug
 * `arrow_back` de la maquette). Ici, il n'y a rien a charger.
 */

const PATHS = {
  flame:
    "M12 3c.6 3 2.2 3.9 3.7 5.6A7.6 7.6 0 0 1 17.8 14a5.8 5.8 0 0 1-11.6 0c0-1.6.7-2.9 1.6-3.9.2 1 .8 1.8 1.7 2 .5-3 1.4-4.6 2.5-6.1Z",
  book: "M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h4.5A1.5 1.5 0 0 1 20 5.5v11a1.5 1.5 0 0 1-1.5 1.5H14a2.5 2.5 0 0 0-2 1 2.5 2.5 0 0 0-2-1H5.5A1.5 1.5 0 0 1 4 16.5ZM12 5v13",
  school: "M12 4 2.8 8.6 12 13.2l9.2-4.6ZM6.4 10.8v4.6c0 1.6 2.5 2.9 5.6 2.9s5.6-1.3 5.6-2.9v-4.6M20.6 9.2v5",
  briefcase:
    "M3.5 8.5h17a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-8a1 1 0 0 1 1-1ZM9 8.5v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18",
  martial:
    "M12 3.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2ZM12 8v5m0 0-3 3-1.4 4.4M12 13l3.2 2.4 1.3 4M12 9.6 8 8.2M12 9.6l4.6-1.8",
  back: "M15 5 8 12l7 7",
  plus: "M12 5.5v13M5.5 12h13",
  close: "M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5",
  check: "M5 12.6 9.6 17 19 7",
  chevron: "M6 9.5 12 15.5 18 9.5",
  calendar:
    "M4.5 6.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1ZM8 4v4.5M16 4v4.5M3.5 11h17",
  alert: "M12 4.4 2.9 19.6h18.2ZM12 10v4M12 16.8v.2",
  bell: "M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15ZM10 20.6a2.2 2.2 0 0 0 4 0",
  trash: "M4.5 7h15M9.5 7V4.8h5V7M7 7l.9 12h8.2L17 7M10.5 10.5v5M13.5 10.5v5",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 8.8V13l2.8 1.8M9.5 2.5h5",
  chart: "M4 19.5h16M7 16V10M12 16V5.5M17 16v-4",
  mic: "M12 3.5a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7",
  send: "M4 12 20.5 4.5 13 21l-2.2-6.8L4 12Z",
  sparkle: "M12 3.5 13.8 9 19.5 10.8 13.8 12.6 12 18.2 10.2 12.6 4.5 10.8 10.2 9 12 3.5Z",
  exit: "M15 4.5H18.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H15M12 8l-4 4 4 4M8 12h11",
  target:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 13.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
