// Resolves a technology name to an icon.
// 1. Our own icon for known non-brand terms (KINDS), 2. the official brand icon from Simple Icons
// (by alias, title or slug), 3. otherwise our own "code" icon. New names never break the build.
import * as simpleIcons from 'simple-icons';

const icons = Object.values(simpleIcons).filter((v) => v && typeof v === 'object' && typeof v.path === 'string' && v.slug);
const bySlug = new Map(icons.map((i) => [i.slug, i]));
const byTitle = new Map(icons.map((i) => [i.title.toLowerCase(), i]));

// names we write that differ from the Simple Icons title
const ALIASES = {
  'docker compose': 'docker', 'telegram bot api': 'telegram', asyncio: 'python', bash: 'gnubash', shell: 'gnubash',
  postgres: 'postgresql', golang: 'go', js: 'javascript', ts: 'typescript', node: 'nodedotjs', k8s: 'kubernetes',
};

// terms with no brand icon get one of ours, by kind
const KINDS = {
  aiogram: 'framework', remnawave: 'api', 'remnawave api': 'api', 'rest api': 'api', api: 'api', websockets: 'api',
  monitoring: 'pulse', cron: 'terminal', 'reverse proxy': 'server',
};

// original line icons on the monogram's 2:1 isometric grid (24x24, stroked)
export const OWN = {
  language: '<path d="M9 8.5 3 12l6 3.5M15 8.5l6 3.5-6 3.5M13.4 6.5l-2.8 11"/>',
  framework: '<path d="M12 4.5l8 4-8 4-8-4z"/><path d="M4 12.5l8 4 8-4"/><path d="M4 16.5l8 4 8-4"/>',
  container: '<path d="M12 3.5l7 3.5v9l-7 3.5-7-3.5v-9z"/><path d="M5 7l7 3.5L19 7M12 10.5V19.5"/>',
  database: '<ellipse cx="12" cy="6.5" rx="7" ry="3.5"/><path d="M5 6.5v11c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-11"/><path d="M5 12c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5"/>',
  api: '<path d="M8.5 4.5c-2 0-2.5 1-2.5 2.6v2.3c0 1.3-.7 2.1-2 2.6 1.3.5 2 1.3 2 2.6v2.3c0 1.6.5 2.6 2.5 2.6M15.5 4.5c2 0 2.5 1 2.5 2.6v2.3c0 1.3.7 2.1 2 2.6-1.3.5-2 1.3-2 2.6v2.3c0 1.6-.5 2.6-2.5 2.6"/><path d="M12 12h.01"/>',
  bot: '<path d="M6 5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-5 3v-3H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M9 10.5h.01M15 10.5h.01"/>',
  server: '<rect x="4" y="4.5" width="16" height="6" rx="1.5"/><rect x="4" y="13.5" width="16" height="6" rx="1.5"/><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h5.5M11 16.5h5.5"/>',
  terminal: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M7.5 9.5l3 2-3 2M12.5 15h4"/>',
  pulse: '<path d="M3 12h4.5l2-5 4 10 2-5H21"/>',
};
OWN.code = OWN.language;

// Brand colours are kept, but nudged darker (light theme) or lighter (dark theme) in OKLCH, hue unchanged,
// just far enough to reach 3:1 against both ends of the chip gradient. Keep CHIP_BG in sync with the
// --button-gray-top / --button-gray-bottom tokens.
const CHIP_BG = { light: ['#FFFFFF', '#F2F2F2'], dark: ['#2A2A2A', '#1D1D1D'] };
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = rgbOf(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function toOklch(h) {
  const [r, g, b] = rgbOf(h).map(lin);
  const [l, m, s] = [0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b].map(Math.cbrt);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function fromOklch(L, C, h) {
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const [l, m, s] = [L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.291485548 * b].map((v) => v ** 3);
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  if (rgb.some((v) => v < -1e-4 || v > 1 + 1e-4)) return null;
  return '#' + rgb.map((v) => Math.min(1, Math.max(0, v))).map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055))
    .map((v) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase()).join('');
}
export function legible(hex, theme, target = 3) {
  const ok = (c) => Math.min(...CHIP_BG[theme].map((b) => contrast(c, b))) >= target;
  if (ok(hex)) return hex;
  let [L, C, h] = toOklch(hex); const step = theme === 'light' ? -0.005 : 0.005;
  while (L > 0 && L < 1) {
    L += step; let c = C, x;
    for (;;) { x = fromOklch(L, c, h); if (x || c < 0.002) break; c *= 0.97; }
    if (x && ok(x)) return x;
  }
  return theme === 'light' ? '#000000' : '#FFFFFF';
}

const norm = (s) => s.toLowerCase().trim();
const stripVersion = (s) => s.replace(/\s*v?\d+(\.\d+)*$/, '');
const toSlug = (s) => s.replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/&/g, 'and').replace(/#/g, 'sharp').replace(/[^a-z0-9]/g, '');

export function resolveTech(name) {
  const n = norm(name), base = stripVersion(n);
  const kind = KINDS[n] ?? KINDS[base];
  if (kind) return { own: OWN[kind], kind };
  for (const key of [n, base]) {
    const alias = ALIASES[key] && bySlug.get(ALIASES[key]);
    const hit = alias || byTitle.get(key) || bySlug.get(toSlug(key));
    if (hit) { const hex = '#' + hit.hex.toUpperCase(); return { brand: hit, hex, light: legible(hex, 'light'), dark: legible(hex, 'dark') }; }
  }
  return { own: OWN.code, kind: 'code' };
}
