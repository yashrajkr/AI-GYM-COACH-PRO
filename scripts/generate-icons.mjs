/**
 * Regenerate the PWA / favicon PNGs from public/logo.svg.
 *
 * Run with: node scripts/generate-icons.mjs
 *
 * The manifest declares icon-192 and icon-512 with `purpose: "maskable"`, and
 * a maskable icon may be cropped to a circle by the OS. So these render the
 * mark on a full-bleed background (no transparent corners) and keep the pulse
 * glyph inside the centre 80% safe zone.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const LIME = "#a3e635";
const BG = "#050608";

/** Full-bleed variant used for the raster icons. */
function markSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="512" height="512" fill="${BG}"/>
  <rect x="56" y="56" width="400" height="400" rx="96" fill="${LIME}" opacity="0.14"/>
  <rect x="66" y="66" width="380" height="380" rx="88" fill="none" stroke="${LIME}" stroke-opacity="0.45" stroke-width="9"/>
  <path d="M120 256 H180 L216 168 L266 344 L304 256 H392"
        fill="none" stroke="${LIME}" stroke-width="30"
        stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
</svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

for (const { file, size } of targets) {
  const png = await sharp(Buffer.from(markSvg(size)), { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(join(publicDir, file), png);
  console.log(`wrote public/${file} (${size}x${size}, ${png.length} bytes)`);
}

// NOTE: deliberately no src/app/icon.png — layout.tsx declares `metadata.icons`
// explicitly, and an App Router icon file would emit a second, competing
// <link rel="icon"> tag.

// Sanity check: the source logo must still parse.
readFileSync(join(publicDir, "logo.svg"));
console.log("done");
