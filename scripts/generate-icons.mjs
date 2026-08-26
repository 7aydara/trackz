/**
 * Genere les icones de Trackz : le caractere 恒 (heng — constance) en
 * rouge cinabre sur une pierre grise, facon sceau.
 *
 * Rendu via Chromium pour obtenir une vraie composition typographique du
 * glyphe. A relancer seulement si le logo change :
 *   npm i -D playwright && node scripts/generate-icons.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "public", "icons");

const CHARACTER = "恒";
const RED = "#d92b3a";
const STONE_TOP = "#3c3b43";
const STONE_BOTTOM = "#2a2930";

/** `bleed` : icone maskable, le fond va jusqu'au bord et le glyphe rentre. */
function page(size, { bleed = false } = {}) {
  const radius = bleed ? 0 : Math.round(size * 0.22);
  const glyph = Math.round(size * (bleed ? 0.46 : 0.6));
  return `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .tile {
    width: ${size}px; height: ${size}px; border-radius: ${radius}px;
    background: linear-gradient(160deg, ${STONE_TOP} 0%, ${STONE_BOTTOM} 100%);
    display: grid; place-items: center; position: relative; overflow: hidden;
  }
  /* Grain tres leger, pour que la pierre ne soit pas un aplat mort. */
  .tile::after {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(120% 80% at 25% 10%, rgba(255,255,255,0.08), transparent 60%),
      radial-gradient(90% 70% at 85% 95%, rgba(0,0,0,0.25), transparent 60%);
  }
  .glyph {
    position: relative; z-index: 1;
    font-family: "WenQuanYi Zen Hei", "Noto Sans SC", "PingFang SC", sans-serif;
    font-size: ${glyph}px; line-height: 1; color: ${RED};
    text-shadow: 0 ${Math.round(size * 0.01)}px ${Math.round(size * 0.02)}px rgba(0,0,0,0.35);
  }
</style>
<div class="tile"><span class="glyph">${CHARACTER}</span></div>`;
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});

await mkdir(OUT, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-maskable-512.png", size: 512, bleed: true },
];

for (const { file, size, bleed } of targets) {
  const ctx = await browser.newContext({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  const p = await ctx.newPage();
  await p.setContent(page(size, { bleed }));
  await p.locator(".tile").screenshot({
    path: path.join(OUT, file),
    omitBackground: true,
  });
  await ctx.close();
  console.log(`${file}  ${size}x${size}`);
}

await browser.close();
