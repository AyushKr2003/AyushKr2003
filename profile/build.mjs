// Builds the SVGs for the GitHub profile README (README.md at the repo root).
//
// GitHub renders README images through <img>: no script, no webfonts, no
// interaction. CSS @keyframes still run, so each SVG carries one motion idea
// from the matching section of the portfolio, pre-computed here, plus its
// fonts as base64 subsets (see fonts/make.py). Every file has a light (paper)
// and dark (ink) version, picked by <picture> in the README.
//
//   node profile/build.mjs          # GITHUB_TOKEN optional, falls back to data.json
//
// .github/workflows/profile.yml runs this daily so signal.svg follows the stars.

import { readFileSync, writeFileSync } from "node:fs";

const DIR = new URL("./", import.meta.url);
const USER = "AyushKr2003";
const FLAGSHIP = "niri-caelestia-shell";

const read = (p) => readFileSync(new URL(p, DIR));
const metrics = JSON.parse(read("fonts/metrics.json"));
const b64 = (p) => read(p).toString("base64");
const FONT = {
  display: `@font-face{font-family:D;src:url(data:font/woff2;base64,${b64("fonts/display.woff2")}) format("woff2")}`,
  mono: `@font-face{font-family:M;src:url(data:font/woff2;base64,${b64("fonts/mono.woff2")}) format("woff2")}`,
};

const THEMES = {
  light: { bg: "#ece8df", fg: "#0e0e0c", line: "rgba(14,14,12,.16)" },
  dark: { bg: "#0e0e0c", fg: "#e9e5db", line: "rgba(233,229,219,.16)" },
};
const SIGNAL = "#ff4a1c";
const W = 880;
const PAD = 32;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r = (n, d = 2) => +n.toFixed(d);
const pct = (i, n) => `${r((i / n) * 100, 2)}%`;

// Seeded so a rebuild with the same data gives a byte-identical file (no
// daily commit unless a number actually changed).
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Keyframe list from one value per step, skipping steps that sit between two
// identical ones: interpolation gives the same result and the file stays small.
function keyframes(vals, steps) {
  return vals
    .map((v, s) => (s > 0 && s < steps && v === vals[s - 1] && v === vals[s + 1] ? "" : `${pct(s, steps)}{${v}}`))
    .join("");
}

function svg(theme, h, fonts, css, body, label) {
  const t = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>${fonts.map((f) => FONT[f]).join("")}
.m{font-family:M,ui-monospace,monospace;font-size:11px;fill:${t.fg}}
.d{font-family:D,sans-serif;font-weight:860;fill:${t.fg}}
.dim{fill-opacity:.5}.sig{fill:${SIGNAL}}.hair{stroke:${t.line};stroke-width:1}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect width="${W}" height="${h}" fill="${t.bg}"/>
${body}
</svg>
`;
}

/* ------------------------------------------------------------------
   Anybody advance widths, interpolated between the sampled wdth values
------------------------------------------------------------------- */
function adv(ch, wdth) {
  const ws = metrics.wdth;
  const a = metrics.display[ch];
  const w = Math.min(150, Math.max(50, wdth));
  const i = Math.min(ws.length - 2, Math.floor((w - ws[0]) / (ws[1] - ws[0])));
  const f = (w - ws[i]) / (ws[i + 1] - ws[i]);
  return a[i] + (a[i + 1] - a[i]) * f;
}
const lineAdv = (text, wdths) => [...text].reduce((s, ch, i) => s + adv(ch, wdths[i]), 0);

/* ------------------------------------------------------------------
   1 · surface: the name, with the hero's width lens
   On the site the cursor is a lens: letters near it widen and the rest
   of the line gives that width back, so the line stays edge to edge.
   GitHub has no cursor, so the lens sweeps on its own. Each frame
   solves for how much the other letters narrow so the line length holds.
------------------------------------------------------------------- */
function surface(theme) {
  const span = W - PAD * 2;
  const BASE = 84;
  const PEAK = 62;
  const SIGMA = 0.11;
  const STEPS = 30;
  const DUR = 9;

  const lines = [
    { text: "AYUSH", delay: 0 },
    { text: "KUMAR SINGH", delay: 0.05 },
  ].map((l) => ({ ...l, size: span / lineAdv(l.text, [...l.text].map(() => BASE)) }));

  // Lens position over the loop: sweep right, rest, sweep back, rest.
  const lensAt = (phase) => {
    const p = ((phase % 1) + 1) % 1;
    const ease = (x) => x * x * (3 - 2 * x);
    if (p < 0.42) return -0.25 + 1.5 * ease(p / 0.42);
    if (p < 0.5) return null;
    if (p < 0.92) return 1.25 - 1.5 * ease((p - 0.5) / 0.42);
    return null;
  };

  let y = 96;
  let css = "";
  let body = "";
  lines.forEach((line, li) => {
    const chars = [...line.text];
    const target = span / line.size;
    const baseW = chars.map(() => BASE);
    const baseX = [];
    chars.reduce((x, ch, i) => ((baseX[i] = x), x + adv(ch, BASE) * line.size), PAD);

    const frames = [];
    for (let s = 0; s <= STEPS; s++) {
      const lens = lensAt(s / STEPS - line.delay);
      if (lens === null) {
        frames.push({ w: baseW, bump: chars.map(() => 0) });
        continue;
      }
      // Lens weight per letter, measured at the letter's centre along the line.
      let acc = 0;
      const bump = chars.map((ch) => {
        const c = (acc + adv(ch, BASE) / 2) / target;
        acc += adv(ch, BASE);
        return Math.exp(-(((c - lens) / SIGMA) ** 2));
      });
      // Bisect the give-back k so the line length stays at the span.
      let lo = -60, hi = 60, w = baseW;
      for (let it = 0; it < 40; it++) {
        const k = (lo + hi) / 2;
        w = chars.map((_, i) => Math.min(150, Math.max(50, BASE + PEAK * bump[i] - k * (1 - bump[i]))));
        lineAdv(line.text, w) > target ? (lo = k) : (hi = k);
      }
      frames.push({ w, bump });
    }

    y += line.size * 0.72;
    chars.forEach((ch, i) => {
      if (ch === " ") return;
      const id = `k${li}${i}`;
      const vals = frames.map((f) => {
        let x = PAD;
        for (let j = 0; j < i; j++) x += adv(chars[j], f.w[j]) * line.size;
        return `transform:translate(${r(x - baseX[i], 0)}px);font-variation-settings:"wdth" ${r(f.w[i], 0)}`;
      });
      css += `@keyframes ${id}{${keyframes(vals, STEPS)}}.${id}{animation:${id} ${DUR}s linear infinite}\n`;
      body += `<text class="d ${id}" x="${r(baseX[i], 1)}" y="${r(y, 1)}" font-size="${r(line.size, 1)}" style="font-variation-settings:'wdth' ${BASE}">${esc(ch)}</text>\n`;
    });

    // The lens itself, as a signal-orange rule under the line.
    const bw = SIGMA * 2 * span;
    const bar = frames.map((_, s) => {
      const lens = lensAt(s / STEPS - line.delay);
      return lens === null
        ? "opacity:0"
        : `transform:translate(${r(Math.min(span - bw, Math.max(0, lens * span - bw / 2)), 1)}px);opacity:${lens < -0.05 || lens > 1.05 ? 0 : 1}`;
    });
    css += `@keyframes b${li}{${keyframes(bar, STEPS)}}.b${li}{animation:b${li} ${DUR}s linear infinite}\n`;
    body += `<rect class="b${li}" x="${PAD}" y="${r(y + 10, 1)}" width="${r(bw, 1)}" height="3" fill="${SIGNAL}" opacity="0"/>\n`;
    y += line.size * 0.12;
  });

  const top = `
<text class="m" x="${PAD}" y="30">aks <tspan class="sig">@</tspan> stack</text>
<text class="m" x="${W / 2}" y="30" text-anchor="middle"><tspan class="sig">1 surface</tspan><tspan class="dim">  2 layers  3 work  4 signal  5 history  6 shell  7 contact</tspan></text>
<text class="m dim" x="${W - PAD}" y="30" text-anchor="end">depth 000</text>
<line class="hair" x1="${PAD}" x2="${W - PAD}" y1="44.5" y2="44.5"/>
<text class="m" x="${PAD}" y="72">Software Engineer</text>
<text class="m dim" x="${W - PAD}" y="72" text-anchor="end">Backend · Mobile · Systems</text>`;

  const metaY = y + 34;
  const meta = [
    ["now", "Backend Developer, Fillip Technology"],
    ["base", "Patna, India"],
    ["open to", "SWE · Backend · Flutter"],
  ];
  const cols = [PAD, PAD + 330, PAD + 540];
  const foot = `
<line class="hair" x1="${PAD}" x2="${W - PAD}" y1="${r(metaY - 20)}" y2="${r(metaY - 20)}"/>
${meta.map(([k, v], i) => `<text class="m" x="${cols[i]}" y="${r(metaY)}"><tspan class="dim">${k}  </tspan>${esc(v)}</text>`).join("\n")}`;

  const h = Math.round(metaY + 26);
  return svg(theme, h, ["display", "mono"], css, top + "\n" + body + foot, "Ayush Kumar Singh. Software engineer: backend, mobile, systems. Patna, India.");
}

/* ------------------------------------------------------------------
   2 · layers: one tap, four layers
   The site explodes four flat planes into an axonometric stack and drops
   a packet through UI → API → data → system. Here the stack is already
   exploded and the packet falls on a loop; each plane lights as it lands
   and writes what that layer did with the request.
------------------------------------------------------------------- */
function layers(theme) {
  const t = THEMES[theme];
  const DUR = 8;
  const L = [
    ["L1", "INTERFACE", "Flutter · Dart · MVVM · feature-first · unit tests", "tap   how do compositors work?"],
    ["L2", "SERVICE", "Laravel · FastAPI · REST · WebSockets · auth", "POST /v1/search            201"],
    ["L3", "DATA", "PostgreSQL · MySQL · SQLite · SQL", "SELECT … FROM sources    12 rows"],
    ["L4", "SYSTEM", "Linux · QML · shell · Git · C / C++", "uvicorn · pid 2041 · linux    ok"],
  ];
  const x0 = PAD + 8;
  const sw = 270; // slab width
  const sk = 64; // axonometric skew
  const sd = 42; // slab depth
  const gap = 88;
  const top = 150;
  const cx = x0 + sk / 2 + sw / 2;
  const hit = [0.16, 0.32, 0.48, 0.64];

  let css = "";
  let body = `
<text class="m" x="${PAD}" y="30"><tspan class="sig">02</tspan> / the stack</text>
<text class="m dim" x="${W - PAD}" y="30" text-anchor="end">follow the packet down</text>
<line class="hair" x1="${PAD}" x2="${W - PAD}" y1="44.5" y2="44.5"/>
<text class="d" x="${PAD}" y="92" font-size="36" style="font-variation-settings:'wdth' 72">ONE TAP, FOUR LAYERS.</text>`;

  // Dashed drop line, behind the planes.
  body += `<line x1="${cx}" x2="${cx}" y1="116" y2="${top + gap * 3 + 4}" stroke="${t.fg}" stroke-opacity=".25" stroke-dasharray="2 4"/>`;

  L.forEach(([id, name, tags, log], i) => {
    const y = top + gap * i;
    const pts = `${x0},${y + sd / 2} ${x0 + sk},${y - sd / 2} ${x0 + sk + sw},${y - sd / 2} ${x0 + sw},${y + sd / 2}`;
    const h = hit[i];
    const flash = (p) => `${pct(h + p, 1)}`;
    css += `@keyframes p${i}{0%,${flash(-0.005)}{fill-opacity:0}${flash(0.01)}{fill-opacity:.9}${flash(0.12)},100%{fill-opacity:0}}`;
    css += `@keyframes g${i}{0%,${flash(-0.005)}{opacity:0}${flash(0.02)},86%{opacity:1}94%,100%{opacity:0}}`;
    css += `.p${i}{animation:p${i} ${DUR}s linear infinite}.g${i}{animation:g${i} ${DUR}s linear infinite}\n`;
    body += `
<polygon points="${pts}" fill="${t.bg}" stroke="${t.fg}" stroke-opacity=".7"/>
<polygon class="p${i}" points="${pts}" fill="${SIGNAL}" fill-opacity="0"/>
<path d="M${x0},${y + sd / 2}v7h${sw}l${sk},${-sd}v-7" fill="none" stroke="${t.fg}" stroke-opacity=".7"/>
<line class="hair" x1="${x0 + sw + sk + 18}" x2="${W - PAD}" y1="${y - sd / 2 + 0.5}" y2="${y - sd / 2 + 0.5}"/>
<text class="m sig" x="${x0 + sw + sk + 18}" y="${y - 2}">${id}</text>
<text class="d" x="${x0 + sw + sk + 52}" y="${y + 1}" font-size="22" style="font-variation-settings:'wdth' 110">${name}</text>
<text class="m dim" x="${x0 + sw + sk + 52}" y="${y + 21}">${esc(tags)}</text>
<text class="m sig g${i}" xml:space="preserve" x="${x0 + sw + sk + 52}" y="${y + 38}" opacity="0">${esc(log)}</text>`;
  });

  // The packet: falls, lands on each plane, and leaves through the bottom.
  const py = (i) => top + gap * i - 6;
  const steps = [
    [0, 110, 0],
    [0.04, 110, 1],
    ...hit.flatMap((h, i) => [
      [h, py(i), 1],
      [h + 0.05, py(i), 1],
    ]),
    [0.76, py(3) + 40, 0],
    [1, py(3) + 40, 0],
  ];
  css += `@keyframes pk{${steps.map(([p, y, o]) => `${pct(p, 1)}{transform:translate(0,${r(y)}px);opacity:${o}}`).join("")}}`;
  css += `.pk{animation:pk ${DUR}s cubic-bezier(.55,0,.75,.4) infinite}\n`;
  body += `<rect class="pk" x="${cx - 5}" y="0" width="10" height="10" fill="${SIGNAL}" opacity="0"/>`;

  const h = top + gap * 3 + 44;
  return svg(theme, h, ["display", "mono"], css, body, "The stack: interface (Flutter), service (Laravel, FastAPI), data (PostgreSQL, MySQL, SQLite), system (Linux, QML, shell).");
}

/* ------------------------------------------------------------------
   4 · signal: one point per stargazer
   On the site the points assemble into their own count and the cursor
   pushes them apart. Here they gather into the count, hold, then drift
   apart and gather again. Rebuilt daily, so the count is live.
------------------------------------------------------------------- */
const DIGITS = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

function signal(theme, data) {
  const t = THEMES[theme];
  const H = 330;
  const DUR = 10;
  const field = { x: PAD, y: 64, w: 470, h: 230 };
  const CELL = 18; // digit pixel: ~5 people per pixel reads as halftone, not noise
  const MAX = 420; // keeps the file under GitHub's SVG size limit
  const per = Math.max(1, Math.ceil(data.stars / MAX));
  const n = Math.ceil(data.stars / per);

  const digits = String(data.stars).split("");
  const cols = digits.length * 6 - 1;
  const px = Math.min(CELL, field.w / cols, field.h / 7);
  const ox = field.x + (field.w - cols * px) / 2;
  const oy = field.y + (field.h - 7 * px) / 2;
  const cells = [];
  digits.forEach((d, di) =>
    DIGITS[d].forEach((row, ry) =>
      [...row].forEach((on, rx) => on === "1" && cells.push([ox + (di * 6 + rx) * px, oy + ry * px])),
    ),
  );

  const rand = rng(data.stars * 7919 + 17);
  const css = `@keyframes s{0%{transform:translate(var(--x),var(--y));opacity:0}22%,80%{transform:none;opacity:1}100%{transform:translate(var(--x),var(--y));opacity:0}}
.s{animation:s ${DUR}s cubic-bezier(.16,1,.3,1) infinite both;animation-delay:var(--t)}\n`;
  let dots = "";
  for (let i = 0; i < n; i++) {
    const [cx0, cy0] = cells[i % cells.length];
    const x = cx0 + px * (0.15 + rand() * 0.7);
    const y = cy0 + px * (0.15 + rand() * 0.7);
    const sx = field.x + rand() * field.w - x;
    const sy = field.y + rand() * field.h - y;
    const hot = i === n - 1; // the newest star
    dots += `<circle class="s" cx="${r(x, 1)}" cy="${r(y, 1)}" r="${hot ? 3.4 : 2.5}" fill="${hot ? SIGNAL : t.fg}" style="--x:${r(sx, 0)}px;--y:${r(sy, 0)}px;--t:${r(rand() * 0.9, 2)}s"/>`;
  }

  const tx = 540;
  const stats = [
    ["stars", data.stars],
    ["forks", data.forks],
    ["public repos", data.repos],
    ["stars, all repos", data.allStars],
  ];
  const body = `
<text class="m" x="${PAD}" y="30"><tspan class="sig">04</tspan> / open source</text>
<text class="m dim" x="${W - PAD}" y="30" text-anchor="end">counted from the GitHub API, daily</text>
<line class="hair" x1="${PAD}" x2="${W - PAD}" y1="44.5" y2="44.5"/>
${dots}
<text class="m" x="${tx}" y="92" font-size="13">Every point here is a person</text>
<text class="m" x="${tx}" y="112" font-size="13">who starred <tspan class="sig">${FLAGSHIP}</tspan>.</text>
${per > 1 ? `<text class="m dim" x="${tx}" y="132">one point = ${per} people</text>` : ""}
${stats
  .map(
    ([k, v], i) => `<line class="hair" x1="${tx}" x2="${W - PAD}" y1="${168.5 + i * 32}" y2="${168.5 + i * 32}"/>
<text class="m dim" x="${tx}" y="${190 + i * 32}">${k}</text>
<text class="m" x="${W - PAD}" y="${190 + i * 32}" text-anchor="end" font-size="13">${v}</text>`,
  )
  .join("\n")}`;

  return svg(theme, H, ["mono"], css, body, `${data.stars} people starred ${FLAGSHIP}. ${data.forks} forks, ${data.repos} public repositories, ${data.allStars} stars across all repositories.`);
}

/* ------------------------------------------------------------------
   Data
------------------------------------------------------------------- */
async function fetchData() {
  const headers = { "User-Agent": USER, Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = async (path) => {
    const res = await fetch(`https://api.github.com/${path}`, { headers });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  };
  const user = await get(`users/${USER}`);
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await get(`users/${USER}/repos?per_page=100&type=owner&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const own = repos.filter((r) => !r.fork);
  const flagship = own.find((r) => r.name === FLAGSHIP);
  return {
    stars: flagship.stargazers_count,
    forks: flagship.forks_count,
    repos: user.public_repos,
    allStars: own.reduce((s, r) => s + r.stargazers_count, 0),
  };
}

const cache = new URL("data.json", DIR);
let data;
try {
  data = await fetchData();
  writeFileSync(cache, JSON.stringify(data, null, 2) + "\n");
} catch (err) {
  console.warn(`GitHub API unavailable (${err.message}), using data.json`);
  data = JSON.parse(readFileSync(cache));
}

for (const theme of Object.keys(THEMES)) {
  for (const [name, make] of Object.entries({ surface, layers, signal })) {
    const out = make(theme, data);
    writeFileSync(new URL(`${name}-${theme}.svg`, DIR), out);
    console.log(`${name}-${theme}.svg  ${(out.length / 1024).toFixed(1)} KB`);
  }
}
