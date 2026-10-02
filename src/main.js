import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { initHero } from "./hero.js";
import { initLayers } from "./layers.js";
import { initWindows } from "./windows.js";
import { initSignal } from "./signal.js";
import { initHistory } from "./history.js";
import { initTerminal } from "./terminal.js";
import { initContact } from "./contact.js";
import { loadStats } from "./data.js";

gsap.registerPlugin(ScrollTrigger);
if (import.meta.env.DEV) window.ScrollTrigger = ScrollTrigger;

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

/* ---------------- smooth scroll ---------------- */
const lenis = reduced
  ? null
  : new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });

if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const ctx = { lenis, reduced, velocity: 0 };

/* Scroll velocity drives one global variable: every .kinetic heading
   condenses under fast scroll and relaxes back when you stop. */
if (!reduced) {
  let target = 0;
  let current = 0;
  lenis.on("scroll", (e) => (target = e.velocity));
  gsap.ticker.add(() => {
    current += (target - current) * 0.12;
    target *= 0.9;
    ctx.velocity = current;
    const kw = 100 - Math.min(48, Math.abs(current) * 2.4);
    root.style.setProperty("--kw", kw.toFixed(1));
  });
}

/* ---------------- themes ---------------- */
const THEMES = {
  paper: { "--bg": "#ece8df", "--fg": "#0e0e0c", "--mute": "#6d695f", "--line": "rgba(14,14,12,0.14)", "--accent": "#ff4a1c" },
  ink: { "--bg": "#0e0e0c", "--fg": "#e9e5db", "--mute": "#8b877d", "--line": "rgba(233,229,219,0.14)", "--accent": "#ff4a1c" },
  signal: { "--bg": "#ff4a1c", "--fg": "#0e0e0c", "--mute": "#5b1906", "--line": "rgba(14,14,12,0.28)", "--accent": "#0e0e0c" },
};
let activeTheme = "paper";
function setTheme(name) {
  if (name === activeTheme) return;
  activeTheme = name;
  root.toggleAttribute("data-dark", name === "ink");
  document.querySelector('meta[name="theme-color"]').content = THEMES[name]["--bg"];
  gsap.to(root, { ...THEMES[name], duration: reduced ? 0 : 0.75, ease: "power2.inOut", overwrite: true });
}

/* ---------------- shell bar ---------------- */
const wsLinks = [...document.querySelectorAll(".bar__ws a")];
const pill = document.querySelector(".bar__ws-pill");
let activeWs = -1;
const pillRO = new ResizeObserver(() => placePill());
function placePill() {
  const a = wsLinks[activeWs];
  if (!a) return;
  pill.style.width = `${a.offsetWidth}px`;
  pill.style.transform = `translateX(${a.offsetLeft}px)`;
}
// every link is observed: a neighbour collapsing moves the active one too
wsLinks.forEach((a) => pillRO.observe(a));
function setWs(i) {
  if (i === activeWs) return;
  wsLinks[activeWs]?.classList.remove("is-active");
  activeWs = i;
  wsLinks[i].classList.add("is-active");
  placePill();
}

// The active section is read from live layout on every scroll, not from
// cached trigger ranges, so pin spacing and late layout shifts can't skew it.
const sections = [...document.querySelectorAll("main > section")];
function syncSection() {
  const line = innerHeight * 0.55;
  let i = 0;
  sections.forEach((sec, j) => {
    if (sec.getBoundingClientRect().top <= line) i = j;
  });
  setTheme(sections[i].dataset.theme);
  setWs(i);
}
function initSections() {
  let queued = false;
  addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        syncSection();
      });
    },
    { passive: true }
  );
  ScrollTrigger.addEventListener("refresh", syncSection);
  syncSection();
}

wsLinks.forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToId(a.getAttribute("href"));
  })
);
document.querySelector(".bar__mark").addEventListener("click", (e) => {
  e.preventDefault();
  scrollToId("#surface");
});

export function scrollToId(id) {
  const el = document.querySelector(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView();
}

const depthEl = document.querySelector("[data-depth]");
ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: (self) => {
    depthEl.textContent = `depth ${String(Math.round(self.progress * 100)).padStart(3, "0")}%`;
  },
});

/* IST clock — shown in the bar and the footer */
const clocks = document.querySelectorAll("[data-clock]");
const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
function tick() {
  const t = `${fmt.format(new Date())} IST`;
  clocks.forEach((c) => (c.textContent = t));
}
tick();
setInterval(tick, 15000);

/* ---------------- boot ---------------- */
function boot() {
  const el = document.querySelector(".boot");
  const log = el.querySelector(".boot__log");
  const seen = sessionStorage.getItem("aks-booted");
  if (reduced || seen) {
    el.remove();
    root.classList.add("is-ready");
    return Promise.resolve(false);
  }
  sessionStorage.setItem("aks-booted", "1");
  lenis?.stop();
  const lines = [
    "[ 0.000] aks@stack: cold boot",
    "[ 0.061] mount /interface ........ <b>ok</b>",
    "[ 0.118] start service.api ....... <b>ok</b>",
    "[ 0.164] attach /data ............ <b>ok</b>",
    "[ 0.207] compositor: niri-ish .... <b>ready</b>",
  ];
  return new Promise((resolve) => {
    const tl = gsap.timeline({
      onComplete: () => {
        el.remove();
        lenis?.start();
        resolve(true);
      },
    });
    lines.forEach((l, i) => tl.call(() => (log.innerHTML += (i ? "\n" : "") + l), null, i * 0.14));
    tl.to(el, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "expo.inOut" }, "+=0.25");
    tl.call(() => root.classList.add("is-ready"), null, "-=0.55");
  });
}

/* ---------------- go ---------------- */
async function start() {
  // fonts first: the hero fits itself to the glyph metrics
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

  const stats = loadStats();
  const hero = initHero(ctx);
  initLayers(ctx);
  initWindows(ctx);
  const signal = initSignal(ctx);
  initHistory(ctx);
  initTerminal(ctx);
  initContact(ctx);
  initSections();

  stats.then((s) => {
    if (!s) return;
    signal?.rebuild(s.niriStars);
  });

  // let first-frame layout (accordion state, fitted type) settle before measuring
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  ScrollTrigger.refresh();
  const animated = await boot();
  hero.intro(animated);
}

start();

let lastW = innerWidth;
addEventListener("resize", () => {
  // ignore mobile url-bar height jitter
  if (Math.abs(innerWidth - lastW) < 2) return;
  lastW = innerWidth;
  ScrollTrigger.refresh();
});
