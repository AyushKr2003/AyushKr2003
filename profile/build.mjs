// Builds the GitHub profile: every SVG in this folder and README.md at the
// repo root, which is nothing but these images stacked, each wrapped in a link.
//
// GitHub renders README images through <img>: no script, no webfonts, no
// interaction. CSS @keyframes still run, so each SVG carries one motion idea
// from the matching section of the portfolio, pre-computed here, plus its
// fonts as base64 subsets (see fonts/make.py). Backgrounds are transparent so
// the images run together on GitHub's own page colour; each has a light and a
// dark version, picked by <picture>.
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
  email: `@font-face{font-family:E;src:url(data:font/woff2;base64,${b64("fonts/email.woff2")}) format("woff2")}`,
};

const THEMES = {
  light: { fg: "#0e0e0c", line: "rgba(14,14,12,.16)" },
  dark: { fg: "#e9e5db", line: "rgba(233,229,219,.16)" },
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

const header = (num, title, note) => `
<text class="m" x="${PAD}" y="30"><tspan class="sig">${num}</tspan> / ${esc(title)}</text>
<text class="m dim" x="${W - PAD}" y="30" text-anchor="end">${esc(note)}</text>
<line class="hair" x1="${PAD}" x2="${W - PAD}" y1="44.5" y2="44.5"/>`;

// Martian Mono has no ↗ or ❯, so both are drawn.
const upRight = (x, y, s = 8) => `<path class="ar" d="M${x},${y + s}L${x + s},${y}M${x + s * 0.3},${y}H${x + s}V${y + s * 0.7}"/>`;
const chevron = (x, y) => `<path class="ar" d="M${x},${y - 7}l4.5,4.5l-4.5,4.5"/>`;

// Opacity on/off at given points of the loop (fractions), for things that
// appear in sequence: typed characters, log lines, commits.
const appear = (id, on, off = 0.92, dur = 10) =>
  `@keyframes ${id}{0%,${pct(Math.max(0, on - 0.001), 1)}{opacity:0}${pct(on, 1)},${pct(off, 1)}{opacity:1}${pct(Math.min(1, off + 0.04), 1)},100%{opacity:0}}.${id}{animation:${id} ${dur}s linear infinite}\n`;

const monoW = (n, size = 11) => n * metrics.mono * size;

function wrap(text, size, width) {
  const max = Math.floor(width / (metrics.mono * size));
  const lines = [""];
  for (const word of text.split(" ")) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + word).trim().length > max) lines.push(word);
    else lines[lines.length - 1] = (cur + " " + word).trim();
  }
  return lines;
}

function svg(theme, h, fonts, css, body, label, w = W) {
  const t = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>${fonts.map((f) => FONT[f]).join("")}
.m{font-family:M,ui-monospace,monospace;font-size:11px;fill:${t.fg}}
.d{font-family:D,sans-serif;font-weight:860;fill:${t.fg}}
.dim{fill-opacity:.5}.mid{fill-opacity:.72}.sig{fill:${SIGNAL}}.hair{stroke:${t.line};stroke-width:1}
.ln{fill:none;stroke:${t.fg};stroke-opacity:.5}.fill{fill:${t.fg}}.ar{fill:none;stroke:${SIGNAL};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
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
  let body = `${header("02", "the stack", "follow the packet down")}
<text class="d" x="${PAD}" y="92" font-size="36" style="font-variation-settings:'wdth' 72">ONE TAP, FOUR LAYERS.</text>`;

  // Dashed drop line, only in the gaps: the planes are open, so it can't hide behind them.
  [116, ...L.slice(0, -1).map((_, i) => top + gap * i + sd / 2 + 7)].forEach((y1, i) => {
    body += `<line x1="${cx}" x2="${cx}" y1="${y1}" y2="${top + gap * i - sd / 2}" stroke="${t.fg}" stroke-opacity=".25" stroke-dasharray="2 4"/>`;
  });

  L.forEach(([id, name, tags, log], i) => {
    const y = top + gap * i;
    const pts = `${x0},${y + sd / 2} ${x0 + sk},${y - sd / 2} ${x0 + sk + sw},${y - sd / 2} ${x0 + sw},${y + sd / 2}`;
    const h = hit[i];
    const flash = (p) => `${pct(h + p, 1)}`;
    css += `@keyframes p${i}{0%,${flash(-0.005)}{fill-opacity:0}${flash(0.01)}{fill-opacity:.9}${flash(0.12)},100%{fill-opacity:0}}`;
    css += `@keyframes g${i}{0%,${flash(-0.005)}{opacity:0}${flash(0.02)},86%{opacity:1}94%,100%{opacity:0}}`;
    css += `.p${i}{animation:p${i} ${DUR}s linear infinite}.g${i}{animation:g${i} ${DUR}s linear infinite}\n`;
    body += `
<polygon points="${pts}" fill="none" stroke="${t.fg}" stroke-opacity=".7"/>
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
${header("04", "open source", "counted from the GitHub API, daily")}
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
   intro: the one paragraph, linking out to the portfolio
------------------------------------------------------------------- */
const SITE = `https://ayushkr2003.github.io/${USER}/`;
const NUDGE = `@keyframes nudge{0%,70%,100%{transform:none}80%{transform:translate(3px,-3px)}}.nudge{animation:nudge 3.2s ease-in-out infinite}\n`;

function intro(theme) {
  const lines = wrap(
    "I build the layers between people and machines: the screen you tap, the API that answers it, the tables underneath, and the desktop shell that draws all of it. At work that means production REST APIs in Laravel at Fillip Technology. Outside it, Flutter apps and the Linux desktop shells I use every day.",
    15,
    W - PAD * 2,
  );
  let body = lines.map((l, i) => `<text class="m" x="${PAD}" y="${34 + i * 26}" font-size="15">${esc(l)}</text>`).join("\n");
  const y = 34 + lines.length * 26 + 20;
  const url = SITE.replace("https://", "").replace(/\/$/, "");
  const ax = PAD + monoW(url.length, 13) + 10;
  body += `
<text class="m sig" x="${PAD}" y="${y}" font-size="13">${url}</text>
<g class="nudge">${upRight(ax, y - 9)}</g>
<text class="m dim" x="${ax + 22}" y="${y}">the long version, with every project running live</text>`;
  return svg(theme, y + 24, ["mono"], NUDGE, body, "I build the layers between people and machines. Portfolio: " + url);
}

/* ------------------------------------------------------------------
   3 · work: each project on the hardware it runs on
   The site's rule for this section, kept: Linux shells get a desktop,
   Flutter apps get a phone, web apps get a browser. Each device acts out
   the one thing its project does, in a 208×108 box.
------------------------------------------------------------------- */
const DEV_W = 208;
const DEV_H = 108;
const monitor = () => `<rect class="ln" x=".5" y=".5" width="${DEV_W - 1}" height="${DEV_H - 1}" rx="5"/>`;
const phone = () => `<rect class="ln" x="75.5" y=".5" width="57" height="107" rx="10"/><rect class="fill" x="97" y="4" width="14" height="2.5" rx="1.25" fill-opacity=".4"/>`;
const browser = () =>
  `${monitor()}<rect class="fill" x="8" y="4" width="56" height="9" rx="2" fill-opacity=".12"/><rect class="ln" x="8.5" y="17.5" width="191" height="9" rx="4.5" stroke-opacity=".3"/>`;
const grow = (id, from, to, dur) =>
  `@keyframes ${id}{0%,${pct(from, 1)}{transform:scaleX(0)}${pct(to, 1)},92%{transform:scaleX(1)}96%,100%{transform:scaleX(0)}}.${id}{transform-box:fill-box;transform-origin:0 50%;animation:${id} ${dur}s cubic-bezier(.2,.8,.2,1) infinite}\n`;

const DEVICES = {
  // niri scrolls an endless strip of columns past a fixed viewport; the
  // focused column stays put while the strip moves under it.
  niri() {
    let wins = "";
    for (let i = 0; i < 5; i++) {
      const x = 6 + i * 104;
      wins += `<rect class="ln" x="${x + 0.5}" y="16.5" width="95" height="85" rx="3"/>`;
      [44 + ((i * 17) % 30), 66, 30 + ((i * 11) % 40)].forEach((w, j) => {
        wins += `<rect class="fill" x="${x + 9}" y="${27 + j * 8}" width="${w}" height="3" fill-opacity="${0.3 - j * 0.06}"/>`;
      });
    }
    return {
      css: `@keyframes strip{0%,14%{transform:none}22%,36%{transform:translate(-104px)}44%,58%{transform:translate(-208px)}66%,80%{transform:translate(-104px)}88%,100%{transform:none}}.strip{animation:strip 9s cubic-bezier(.6,0,.2,1) infinite}\n`,
      body: `${monitor()}<line class="hair" x1="1" x2="${DEV_W - 1}" y1="10.5" y2="10.5"/>
<rect class="sig" x="7" y="4" width="8" height="3" rx="1.5"/><rect class="fill" x="18" y="4" width="3" height="3" rx="1.5" fill-opacity=".35"/><rect class="fill" x="24" y="4" width="3" height="3" rx="1.5" fill-opacity=".35"/>
<clipPath id="scr"><rect x="4" y="13" width="200" height="91"/></clipPath>
<g clip-path="url(#scr)"><g class="strip">${wins}</g></g>
<rect x="6.5" y="16.5" width="95" height="85" rx="3" fill="none" stroke="${SIGNAL}" stroke-width="1.5"/>`,
    };
  },

  // Caelestia v2: the frame and its drawers are one surface, so a drawer
  // grows out of the border on a spring instead of floating above windows.
  omacale(t) {
    return {
      css: `@keyframes drawer{0%,8%{transform:scaleX(0)}20%{transform:scaleX(1.08)}26%,62%{transform:scaleX(1)}74%,100%{transform:scaleX(0)}}.drawer{transform-box:fill-box;transform-origin:0 50%;animation:drawer 7s cubic-bezier(.3,0,.3,1) infinite}\n`,
      body: `<rect class="ln" x="12.5" y="16.5" width="111" height="79" rx="4"/>
<rect x="130" y="16" width="66" height="38" rx="4" fill="${SIGNAL}" fill-opacity=".16"/>
<rect class="ln" x="130.5" y="16.5" width="65" height="37" rx="4"/><rect class="ln" x="130.5" y="58.5" width="65" height="37" rx="4"/>
<g class="drawer"><rect class="fill" x="0" y="30" width="70" height="52" rx="10"/><circle cx="34" cy="48" r="6" fill="${SIGNAL}"/><rect x="26" y="60" width="26" height="3" rx="1.5" fill="${SIGNAL}" fill-opacity=".6"/></g>
<path class="fill" fill-rule="evenodd" d="M0,0H${DEV_W}V${DEV_H}H0Z M16,10H192a8,8 0 0 1 8,8V94a8,8 0 0 1 -8,8H16a8,8 0 0 1 -8,-8V18a8,8 0 0 1 8,-8Z"/>`,
    };
  },

  // The overview zooms out of the current workspace into all of them.
  overview() {
    const ws = [[8, 16], [106, 16], [8, 60], [106, 60]];
    const s = 200 / 94;
    const z = `translate(${r(4 - 8 * s)}px,${r(14 - 16 * s)}px) scale(${r(s, 3)})`;
    const inner = ws
      .map(([x, y], i) => {
        const wins = i === 3 ? [[5, 40]] : [[5, 40], [48, 41]];
        return (
          wins.map(([dx, w]) => `<rect class="fill" x="${x + dx}" y="${y + 5}" width="${w}" height="32" rx="2" fill-opacity=".14"/>`).join("") +
          `<rect x="${x + 0.5}" y="${y + 0.5}" width="93" height="41" rx="3" ${i ? `class="ln"` : `fill="none" stroke="${SIGNAL}" stroke-width="1.5"`} vector-effect="non-scaling-stroke"/>`
        );
      })
      .join("");
    return {
      css: `@keyframes zoom{0%,18%{transform:${z}}34%,72%{transform:none}88%,100%{transform:${z}}}.zoom{transform-origin:0 0;animation:zoom 8s cubic-bezier(.65,0,.35,1) infinite}\n`,
      body: `${monitor()}<line class="hair" x1="1" x2="${DEV_W - 1}" y1="10.5" y2="10.5"/>
<clipPath id="scr"><rect x="4" y="13" width="200" height="91"/></clipPath>
<g clip-path="url(#scr)"><g class="zoom">${inner}</g></g>`,
    };
  },

  // Musixir: the colour the uploader picked themes the art, the progress
  // bar and the play button together; it changes with each track.
  musixir(t) {
    return {
      css: `@keyframes tint{0%,30%{fill:${SIGNAL};fill-opacity:1}36%,63%{fill:${t.fg};fill-opacity:.85}69%,94%{fill:${SIGNAL};fill-opacity:.5}100%{fill:${SIGNAL};fill-opacity:1}}.tint{animation:tint 9s infinite}
@keyframes prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}.prog{transform-box:fill-box;transform-origin:0 50%;animation:prog 3s linear infinite,tint 9s infinite}\n`,
      body: `${phone()}<rect class="tint" x="81" y="13" width="46" height="46" rx="4"/>
<rect class="fill" x="81" y="65" width="34" height="3" fill-opacity=".6"/><rect class="fill" x="81" y="71" width="22" height="3" fill-opacity=".3"/>
<rect class="fill" x="81" y="80" width="46" height="2" fill-opacity=".18"/><rect class="prog" x="81" y="80" width="46" height="2"/>
<circle class="fill" cx="92" cy="93" r="2.5" fill-opacity=".4"/><circle class="tint" cx="104" cy="93" r="5"/><circle class="fill" cx="116" cy="93" r="2.5" fill-opacity=".4"/>`,
    };
  },

  // CognitoAI: it listens, then answers.
  cognito() {
    const bars = [...Array(7)]
      .map((_, k) => `<rect class="sig wv" x="${84 + k * 6}" y="44" width="3" height="20" rx="1.5" style="animation-delay:-${r(k * 0.13)}s"/>`)
      .join("");
    return {
      css: `@keyframes wv{0%,100%{transform:scaleY(.2)}50%{transform:scaleY(1)}}.wv{transform-box:fill-box;transform-origin:50% 50%;animation:wv .9s ease-in-out infinite}
${appear("listen", 0, 0.45, 6)}${appear("say", 0.5, 0.88, 6)}`,
      body: `${phone()}<g class="listen">${bars}</g>
<g class="say" opacity="0"><rect x="82" y="16" width="44" height="40" rx="6" fill="${SIGNAL}"/><rect x="88" y="23" width="30" height="2.5" fill="#fff" fill-opacity=".9"/><rect x="88" y="29" width="32" height="2.5" fill="#fff" fill-opacity=".9"/><rect x="88" y="35" width="24" height="2.5" fill="#fff" fill-opacity=".9"/><rect x="88" y="41" width="28" height="2.5" fill="#fff" fill-opacity=".9"/></g>
<circle class="ln" cx="104" cy="85" r="9"/><rect class="sig" x="102" y="80" width="4" height="8" rx="2"/>`,
    };
  },

  // SageSearch: a cited answer streams in line by line.
  sage() {
    const widths = [150, 138, 156, 96];
    let css = "";
    let body = `${browser()}<rect class="ln" x="30.5" y="35.5" width="148" height="12" rx="6"/><circle class="sig" cx="38" cy="41.5" r="2.5"/>`;
    widths.forEach((w, i) => {
      const a = 0.1 + i * 0.12;
      css += grow(`a${i}`, a, a + 0.1, 7);
      body += `<rect class="fill a${i}" x="30" y="${58 + i * 9}" width="${w}" height="3" fill-opacity=".5"/>`;
      if (i % 2 === 0) {
        css += appear(`c${i}`, a + 0.1, 0.92, 7);
        body += `<rect class="sig c${i}" x="${30 + w + 4}" y="${57 + i * 9}" width="9" height="5" rx="1" opacity="0"/>`;
      }
    });
    return { css, body };
  },

  // NexVote: a vote lands on the tally and becomes the newest block.
  nexvote() {
    let body = browser();
    [60, 90, 40].forEach((w, i) => {
      const y = 38 + i * 12;
      body += `<rect class="fill" x="16" y="${y}" width="30" height="4" fill-opacity=".35"/><rect class="fill" x="54" y="${y - 1}" width="${w}" height="6" fill-opacity=".28"/>`;
    });
    body += `<rect class="sig vote" x="144" y="49" width="14" height="6"/>`;
    for (let i = 0; i < 5; i++) {
      body += `<rect class="ln" x="${16.5 + i * 20}" y="80.5" width="11" height="11" rx="2"/>`;
      body += `<line class="ln" x1="${28 + i * 20}" x2="${36 + i * 20}" y1="86.5" y2="86.5"/>`;
    }
    body += `<rect class="sig blk" x="116" y="80" width="12" height="12" rx="2"/>`;
    return {
      css: `${grow("vote", 0.28, 0.38, 7)}@keyframes blk{0%,40%{transform:translate(40px);opacity:0}55%,92%{transform:none;opacity:1}96%,100%{transform:none;opacity:0}}.blk{animation:blk 7s cubic-bezier(.2,.8,.2,1) infinite}\n`,
      body,
    };
  },
};

const WORK = [
  {
    name: "niri-caelestia-shell",
    on: "linux · niri · wayland",
    device: "niri",
    desc: "Caelestia v1 ported to the niri compositor. I added a visual config editor, battery and CPU/GPU monitors, niri IPC controls and launcher modes for clipboard, OCR and Google Lens. Archived since I moved to Hyprland.",
  },
  {
    name: "omacale",
    on: "linux · hyprland · omarchy",
    device: "omacale",
    desc: "Caelestia v2 ported 1:1 to Omarchy as one bar plugin, with no daemon and no build step. An SDF shader merges the frame and every drawer into one surface; Material 3 colours regenerate from the wallpaper.",
  },
  {
    name: "omarchy-overview",
    on: "linux · omarchy",
    device: "overview",
    desc: "Workspace overview with live window previews for the Omarchy shell.",
  },
  {
    name: "Musixir",
    on: "android · flutter + fastapi",
    device: "musixir",
    desc: "Music streaming with background playback. The colour an uploader picks themes the player. Runs on my own FastAPI service with JWT auth, uploads and favourites.",
  },
  {
    name: "CognitoAI",
    on: "android + ios · flutter",
    device: "cognito",
    desc: "A voice assistant. GPT-3.5 decides whether you asked for a picture: questions get a ChatGPT answer read aloud, picture requests go to DALL·E.",
  },
  {
    name: "SageSearch",
    repo: "sage_search",
    on: "web · flutter + fastapi",
    device: "sage",
    desc: "Searches the live web through Tavily, ranks the sources with sentence-transformers and streams a cited Gemini answer over a WebSocket.",
  },
  {
    name: "NexVote",
    on: "web · flutter + solidity",
    device: "nexvote",
    desc: "Voting where every ballot is an Ethereum transaction, cast from MetaMask through web3dart. Team project; I built the Flutter app.",
  },
];

function workHead(theme) {
  const body = `${header("03", "selected work", "each row opens its repo")}
<text class="d" x="${PAD}" y="92" font-size="36" style="font-variation-settings:'wdth' 72">EACH ON ITS OWN HARDWARE.</text>`;
  return svg(theme, 112, ["display", "mono"], "", body, "Selected work, each on its own hardware.");
}

function workRow(theme, p, i) {
  const t = THEMES[theme];
  const SIZE = 32;
  const WD = 92;
  const name = p.name.toUpperCase();
  const nameW = lineAdv(name, [...name].map(() => WD)) * SIZE;
  const lines = wrap(p.desc, 11, 570);
  if (lines.length > 3) throw new Error(`${p.name}: description runs to ${lines.length} lines`);
  const dev = DEVICES[p.device](t);
  const body = `<line class="hair" x1="${PAD}" x2="${W - PAD}" y1=".5" y2=".5"/>
<text class="m sig" x="${PAD}" y="26">03.${i + 1}</text>
<text class="m dim" x="${PAD + 44}" y="26">${esc(p.on)}</text>
<text class="d" x="${PAD}" y="64" font-size="${SIZE}" style="font-variation-settings:'wdth' ${WD}">${esc(name)}</text>
<g class="nudge">${upRight(PAD + nameW + 12, 64 - 21, 13)}</g>
${lines.map((l, j) => `<text class="m mid" x="${PAD}" y="${90 + j * 16}">${esc(l)}</text>`).join("\n")}
<g transform="translate(${W - PAD - DEV_W},22)">${dev.body}</g>`;
  return svg(theme, 142, ["display", "mono"], NUDGE + dev.css, body, `${p.name}: ${p.desc}`);
}

/* ------------------------------------------------------------------
   5 · history: career as git log --graph
   On the site a scroll playhead draws the graph. Here it draws itself
   from the first commit up to HEAD, and each commit lands as the line
   reaches it.
------------------------------------------------------------------- */
function history(theme) {
  const t = THEMES[theme];
  const DUR = 14;
  const DRAW = 0.42;
  const rows = [
    { date: "2026-08", refs: "HEAD → job/fillip", title: "Backend Developer · Fillip Technology", note: "Production REST APIs in Laravel, PHP and MySQL: schemas, auth, business logic." },
    { date: "2026", refs: "tag: v1.0-graduate", title: "B.E. Computer Science · Chandigarh University", note: "2022 to 2026, CGPA 7.9." },
    { date: "2025", title: "feat: niri-caelestia-shell", note: "Became my most-starred repo and started the omacale line." },
    { date: "2025-01", title: "merge internship/medoc", note: "Six months of production Flutter, merged back into main." },
    { date: "2024-07", lane: 1, title: "Flutter Developer Intern · Medoc", note: "Feature-first Flutter with MVVM on a remote team, REST, unit tests." },
    { date: "2022-11", title: "init: Simple_AI", note: 'Its README still says "My first project".' },
  ];
  const y0 = 86;
  const step = 54;
  const yEnd = y0 + step * (rows.length - 1);
  const lane = [52, 78];
  const at = (y) => (DRAW * (yEnd - y)) / (yEnd - y0);

  const draw = (id, from, to) =>
    `@keyframes ${id}{0%,${pct(from, 1)}{stroke-dashoffset:1;opacity:1}${pct(to, 1)},92%{stroke-dashoffset:0;opacity:1}96%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}.${id}{animation:${id} ${DUR}s linear infinite}\n`;
  let css = draw("main", 0, DRAW) + draw("br", at(yEnd - 14), at(y0 + step * 3 + 4));
  css += `@keyframes pulse{0%{transform:scale(1);opacity:.8}100%{transform:scale(3.2);opacity:0}}.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 1.6s ease-out infinite}\n`;

  const by = (i) => y0 + step * i;
  let body = `${header("05", "git log --graph", "first commit to HEAD")}
<path class="main" d="M${lane[0]},${yEnd}V${y0}" pathLength="1" stroke-dasharray="1" fill="none" stroke="${t.fg}" stroke-opacity=".6" stroke-width="1.5"/>
<path class="br" d="M${lane[0]},${yEnd - 14}C${lane[0]},${yEnd - 30} ${lane[1]},${by(4) + 26} ${lane[1]},${by(4) + 12}V${by(3) + 30}C${lane[1]},${by(3) + 14} ${lane[0]},${by(3) + 16} ${lane[0]},${by(3) + 4}" pathLength="1" stroke-dasharray="1" fill="none" stroke="${SIGNAL}" stroke-opacity=".8" stroke-width="1.5"/>`;

  rows.forEach((row, i) => {
    const y = by(i);
    const x = lane[row.lane || 0];
    const id = `r${i}`;
    css += appear(id, at(y), 0.92, DUR);
    const dot = i === 0
      ? `<circle class="pulse" cx="${x}" cy="${y}" r="5" fill="none" stroke="${SIGNAL}"/><circle cx="${x}" cy="${y}" r="5" fill="${SIGNAL}"/>`
      : `<circle class="fill" cx="${x}" cy="${y}" r="4.5"/>`;
    body += `
<g class="${id}" opacity="0">${dot}
<text class="m dim" x="110" y="${y + 4}">${row.date}</text>
<text class="m" x="180" y="${y + 4}" font-size="13">${row.refs ? `<tspan class="sig">(${esc(row.refs)}) </tspan>` : ""}${esc(row.title)}</text>
<text class="m dim" x="180" y="${y + 22}">${esc(row.note)}</text></g>`;
  });
  return svg(theme, yEnd + 40, ["mono"], css, body, rows.map((r) => `${r.date}: ${r.title}`).join(". "));
}

/* ------------------------------------------------------------------
   6 · shell: fish, running fastfetch
   On the site this is a working shell. An image can't take input, so it
   types its own command; the real one is on the portfolio.
------------------------------------------------------------------- */
function shell(theme) {
  const t = THEMES[theme];
  const DUR = 12;
  const X = 56;
  const prompt = "ayush@stack ~ ";
  const cmdX = X + monoW(prompt.length, 13) + 12;
  const cmd = "fastfetch";
  const out = [
    ["os", "Arch Linux · Omarchy"],
    ["wm", "Hyprland"],
    ["shell", "fish"],
    ["langs", "Python · PHP · Dart · C / C++ · Java · SQL · Bash"],
    ["backend", "Laravel · FastAPI · PostgreSQL · MySQL · SQLite · WebSockets"],
    ["mobile", "Flutter · MVVM · feature-first"],
    ["desktop", "QML · Quickshell · GLSL"],
    ["also", "Git · Postman · Solidity"],
  ];
  const OUT = 0.34;
  let css = `@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}.blink{animation:blink 1s steps(1) infinite}\n`;
  const promptLine = (y) =>
    `<text class="m" x="${X}" y="${y}" font-size="13" xml:space="preserve">ayush<tspan class="sig">@stack</tspan><tspan class="dim"> ~ </tspan></text>${chevron(cmdX - 12, y - 4)}`;

  let body = `${header("06", "shell", "the interactive one is on the portfolio")}
<rect class="ln" x="${PAD + 0.5}" y="60.5" width="${W - PAD * 2 - 1}" height="342" rx="6" stroke-opacity=".35"/>
<text class="m dim" x="${W / 2}" y="80" text-anchor="middle">fish  ~/ayush</text>
<line class="hair" x1="${PAD + 1}" x2="${W - PAD - 1}" y1="92.5" y2="92.5"/>
${promptLine(122)}`;

  [...cmd].forEach((ch, i) => {
    css += appear(`t${i}`, 0.06 + i * 0.025, 0.92, DUR);
    body += `<text class="m t${i}" x="${r(cmdX + monoW(i, 13), 1)}" y="122" font-size="13" opacity="0">${ch}</text>`;
  });

  // The logo slot holds the stack itself.
  css += appear("logo", OUT, 0.92, DUR);
  body += `<g class="logo" opacity="0">`;
  for (let k = 0; k < 4; k++) {
    const y = 160 + k * 26;
    body += `<polygon points="${X},${y + 9} ${X + 22},${y - 7} ${X + 112},${y - 7} ${X + 90},${y + 9}" ${k === 0 ? `fill="${SIGNAL}"` : `class="ln"`}/>`;
  }
  body += `</g>`;

  const OX = 210;
  const lines = [
    `<tspan>ayush</tspan><tspan class="sig">@stack</tspan>`,
    `<tspan class="dim">-----------</tspan>`,
    ...out.map(([k, v]) => `<tspan class="sig">${k.padEnd(9)}</tspan>${esc(v)}`),
  ];
  lines.forEach((l, k) => {
    css += appear(`o${k}`, OUT + k * 0.018, 0.92, DUR);
    body += `<text class="m o${k}" x="${OX}" y="${150 + k * 20}" font-size="12" xml:space="preserve" opacity="0">${l}</text>`;
  });

  const py = 150 + lines.length * 20 + 26;
  css += appear("p2", OUT + lines.length * 0.018 + 0.02, 0.92, DUR);
  body += `<g class="p2" opacity="0">${promptLine(py)}<rect class="fill blink" x="${cmdX}" y="${py - 11}" width="8" height="14"/></g>`;

  return svg(theme, 418, ["mono"], css, body, `fastfetch: ${out.map(([k, v]) => `${k} ${v}`).join("; ")}`);
}

/* ------------------------------------------------------------------
   7 · contact: exit 0
   As on the site, the address starts fully condensed and widens until
   it spans the page.
------------------------------------------------------------------- */
const EMAIL = "ayushkrsngh2003@gmail.com";

function contact(theme) {
  const t = THEMES[theme];
  const size = (W - PAD * 2) / lineAdv(EMAIL, [...EMAIL].map(() => 150));
  const y = 92 + 30 + size * 0.78;
  const [user, host] = EMAIL.split("@");
  const css = `.e{font-family:E,sans-serif;font-weight:860;fill:${t.fg}}
@keyframes wide{0%,8%{font-variation-settings:"wdth" 50}40%,82%{font-variation-settings:"wdth" 150}96%,100%{font-variation-settings:"wdth" 50}}.wide{animation:wide 10s cubic-bezier(.65,0,.35,1) infinite}
${NUDGE}`;
  const body = `${header("07", "exit 0", "open to SWE, backend and Flutter roles")}
<text class="d" x="${PAD}" y="92" font-size="36" style="font-variation-settings:'wdth' 72">NEED SOMEONE ACROSS THE STACK?</text>
<text class="e wide" x="${PAD}" y="${r(y, 1)}" font-size="${r(size, 1)}" style="font-variation-settings:'wdth' 150">${user}<tspan class="sig">@</tspan>${host}</text>
<text class="m dim" x="${PAD}" y="${r(y + 30, 1)}">click to write</text>
<g class="nudge">${upRight(PAD + monoW(14) + 8, y + 22)}</g>`;
  return svg(theme, Math.round(y + 44), ["display", "mono", "email"], css, body, `Need someone across the stack? ${EMAIL}`);
}

const LINKS = [
  ["portfolio", SITE],
  ["linkedin", "https://www.linkedin.com/in/ayush-kumar-singh-8b6b00249"],
  ["codolio", "https://codolio.com/profile/shadowMonarch"],
  ["resume.pdf", `${SITE}Ayush_Kumar_Singh_Resume.pdf`],
];

// Four of these sit side by side at 25% each. Every chip keeps the 32px
// gutter on its left, and the rules are cut to the same length so the last
// one stops at the page's right margin.
function chip(theme, [label], i) {
  const CW = W / 4;
  const css = NUDGE.replace(".nudge{", `.nudge{animation-delay:${r(i * 0.35)}s;`);
  const body = `<line class="hair" x1="${PAD}" x2="${CW - PAD}" y1=".5" y2=".5"/>
<text class="m dim" x="${PAD}" y="26">0${i + 1}</text>
<text class="m" x="${PAD}" y="48" font-size="14">${label}</text>
<g class="nudge">${upRight(PAD + monoW(label.length, 14) + 10, 38)}</g>`;
  return svg(theme, 64, ["mono"], css, body, label, CW);
}

function colophon(theme) {
  const body = `<text class="m dim" x="${PAD}" y="24" font-size="10">© 2026 Ayush Kumar Singh · every image on this page is hand-written SVG, set in Anybody and Martian Mono</text>
<text class="m dim" x="${PAD}" y="42" font-size="10">with the fonts embedded · the star field is recounted daily from the GitHub API · source: profile/build.mjs</text>`;
  return svg(theme, 56, ["mono"], "", body, "Colophon");
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

/* ------------------------------------------------------------------
   Output: the SVGs, then README.md as those SVGs stacked in links
------------------------------------------------------------------- */
const REPO = (name) => `https://github.com/${USER}/${name}`;
const SECTIONS = [
  { name: "surface", href: SITE, make: surface },
  { name: "intro", href: SITE, make: intro },
  { name: "layers", href: SITE, make: layers },
  { name: "work", href: `${REPO("")}?tab=repositories`.replace("/?", "?"), make: workHead },
  ...WORK.map((p, i) => ({ name: `work-${i + 1}`, href: REPO(p.repo || p.name), make: (th) => workRow(th, p, i), tight: true })),
  { name: "signal", href: `${REPO(FLAGSHIP)}/stargazers`, make: signal },
  { name: "history", href: SITE, make: history },
  { name: "shell", href: SITE, make: shell },
  { name: "contact", href: `mailto:${EMAIL}`, make: contact },
  ...LINKS.map((l, i) => ({ name: `link-${i + 1}`, href: l[1], make: (th) => chip(th, l, i), width: "25%", row: true })),
  { name: "colophon", href: `${REPO(USER)}/tree/main/profile`, make: colophon },
];

const RAW = `https://raw.githubusercontent.com/${USER}/${USER}/main/profile/`;
const alts = {};
for (const sec of SECTIONS) {
  for (const theme of Object.keys(THEMES)) {
    const out = sec.make(theme, data);
    alts[sec.name] = out.match(/aria-label="([^"]*)"/)[1];
    writeFileSync(new URL(`${sec.name}-${theme}.svg`, DIR), out);
    if (out.length > 45 * 1024) console.warn(`${sec.name}-${theme}.svg is ${(out.length / 1024).toFixed(1)} KB`);
  }
}

const pic = (sec) =>
  `<a href="${sec.href}"><picture><source media="(prefers-color-scheme: dark)" srcset="${RAW}${sec.name}-dark.svg"><img src="${RAW}${sec.name}-light.svg" width="${sec.width || "100%"}" alt="${alts[sec.name]}"></picture></a>`;

// Consecutive work rows share a paragraph (no gap between them); the link
// chips share one line with no whitespace, so they sit side by side.
const blocks = [];
for (const sec of SECTIONS) {
  const prev = blocks[blocks.length - 1];
  if (sec.row && prev?.row) prev.html += pic(sec);
  else if (sec.tight && prev?.tight) prev.html += "\n" + pic(sec);
  else blocks.push({ html: pic(sec), row: sec.row, tight: sec.tight || sec.name === "work" });
}
writeFileSync(
  new URL("../README.md", DIR),
  `<!-- Generated by profile/build.mjs: edit that and rebuild, not this file. -->\n\n${blocks.map((b) => b.html).join("\n\n")}\n`,
);
console.log(`${SECTIONS.length * 2} SVGs and README.md written`);
