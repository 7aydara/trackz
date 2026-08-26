"use client";

const COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#7c3aed", "#ec4899"];

/**
 * Petite explosion de confettis autour d'un element, sans dependance :
 * quelques divs animees en CSS puis nettoyees. Silencieux si l'utilisateur
 * a demande a reduire les animations.
 */
export function burstConfetti(anchor: HTMLElement | null, pieces = 16) {
  if (typeof window === "undefined" || !anchor) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const rect = anchor.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.style.cssText = `position:fixed;left:${rect.left + rect.width / 2}px;top:${
    rect.top + rect.height / 2
  }px;width:0;height:0;pointer-events:none;z-index:80;`;

  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement("div");
    const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.5;
    const distance = 40 + Math.random() * 70;
    piece.className = "confetti-piece";
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance + 60}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    piece.style.animationDelay = `${Math.random() * 90}ms`;
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1400);
}
