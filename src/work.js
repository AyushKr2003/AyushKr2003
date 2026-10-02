import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountApp, loadAppFonts } from "./apps/core.js";
import { initGallery } from "./apps/gallery.js";
import { CAELESTIA_LOGO } from "./apps/niri.js";
import sage from "./apps/sage.js";
import niri from "./apps/niri.js";
import nexvote from "./apps/nexvote.js";
import musixir from "./apps/musixir.js";
import cognito from "./apps/cognito.js";
import omacale from "./apps/omacale.js";

const APPS = { sage, niri, nexvote, musixir, cognito, omacale };

/*
  Selected work, shown on the platform each project was built for.

  3a · Linux. Two outputs side by side. DP-1 runs the shells, DP-2 is a
  rotated monitor with kitty on it. The scroll position picks a project,
  and changing it does what really happens on that machine. From niri to
  Hyprland is a session change: quit the compositor, drop to a TTY and
  start the other one. The terminal keeps one fish session going the
  whole time.

  3b · Flutter. One device that changes shape. Musixir and CognitoAI run
  on a phone, and going from one to the other is Android's recents: the
  app shrinks to a card, the next card slides in and opens. Scrolling on
  turns the phone to landscape and keeps going until it's a browser
  window, because the last two apps are Flutter web (`flutter run -d
  chrome`). Everything is scrubbed by the scroll. Switching web apps is
  just a tab change.
*/
export function initWork(ctx) {
  ScrollTrigger.create({ trigger: ".work", start: "top 250%", once: true, onEnter: loadAppFonts });
  const desk = initDesk(ctx);
  const dev = initDev(ctx);
  initGallery(ctx);

  // ← → step through whichever scene is pinned
  addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    if (document.activeElement?.matches("input, textarea")) return;
    const scene = [desk, dev].find((s) => s.st.isActive);
    if (!scene) return;
    e.preventDefault();
    scene.go(scene.index() + (e.key === "ArrowRight" ? 1 : -1));
  });
}

/* A pinned scene whose progress picks one of n stops. After the wheel
   rests, Lenis glides to the nearest stop. ScrollTrigger's own snap fights
   Lenis's interpolation, so this waits for the scroll to settle first.
   With reduced motion nothing pins: the scene sits still and its buttons
   (or ← →) switch projects in place. */
function pinScene(ctx, pin, length, opts) {
  if (ctx.reduced) return ScrollTrigger.create({ trigger: pin, start: "top center", end: "bottom center" });
  return ScrollTrigger.create({ trigger: pin, start: "top top", end: () => `+=${innerHeight * length}`, pin: true, ...opts });
}
function scene(ctx, st, stops, jump) {
  if (ctx.reduced) return (i) => jump(Math.max(0, Math.min(stops.length - 1, i)));
  const yFor = (i) => st.start + stops[i] * (st.end - st.start);
  const go = (i) => {
    i = Math.max(0, Math.min(stops.length - 1, i));
    if (ctx.lenis) ctx.lenis.scrollTo(yFor(i), { duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else scrollTo(0, yFor(i));
  };
  let settle;
  ctx.lenis?.on("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      const y = ctx.lenis.animatedScroll;
      if (y <= st.start + 2 || y >= st.end - 2) return;
      let best = 0;
      stops.forEach((_, i) => Math.abs(yFor(i) - y) < Math.abs(yFor(best) - y) && (best = i));
      if (Math.abs(yFor(best) - y) > 2) ctx.lenis.scrollTo(yFor(best), { duration: 0.7, easing: (t) => 1 - Math.pow(1 - t, 3) });
    }, 160);
  });
  return go;
}

/* ------------------------------------------------------------------
   3a · Linux
------------------------------------------------------------------- */
function initDesk(ctx) {
  const root = document.querySelector("[data-desk]");
  const pin = root.querySelector(".desk__pin");
  const panes = [...root.querySelectorAll("[data-pane]")];
  const blocks = [...root.querySelectorAll("[data-kt]")];
  const acts = [...root.querySelectorAll("[data-acts] > span")];
  const tabs = [...root.querySelectorAll(".desk__ws [data-go]")];
  const tty = root.querySelector("[data-tty]");
  const ttyLog = root.querySelector("[data-tty-log]");
  const wmCap = root.querySelector("[data-wm-cap]");
  const kittyTitle = root.querySelector("[data-kitty-title]");
  const N = panes.length;
  const DIRS = ["~/s/niri-caelestia-shell", "~/s/omacale"];

  root.querySelectorAll("[data-logo]").forEach((l) => (l.innerHTML = CAELESTIA_LOGO));
  const apps = panes.map((p) => {
    const viz = p.querySelector("[data-app]");
    return mountApp(viz, APPS[viz.dataset.app], ctx, { manual: true });
  });

  /* fish, typed: commands character by character, output a line at a time */
  const typing = new Map();
  function typeBlock(b) {
    typing.get(b)?.kill();
    const lines = [...b.children];
    if (ctx.reduced) return gsap.set(lines, { autoAlpha: 1 });
    const tl = gsap.timeline();
    gsap.set(lines, { autoAlpha: 0 });
    let t = 0.15;
    lines.forEach((line) => {
      tl.set(line, { autoAlpha: 1 }, t);
      const cmd = line.classList.contains("c") && line.querySelector("span");
      if (cmd) {
        const text = (cmd.dataset.text ??= cmd.textContent);
        const o = { n: 0 };
        const dur = Math.min(0.9, text.length * 0.022);
        tl.fromTo(o, { n: 0 }, { n: text.length, duration: dur, ease: "none", onUpdate: () => (cmd.textContent = text.slice(0, Math.round(o.n))) }, t);
        t += dur + 0.25;
      } else t += 0.06;
    });
    typing.set(b, tl);
  }

  /* compositor change: a session switch through a TTY */
  let idx = -1;
  let trans;
  const wm = (i) => panes[i].dataset.wm;
  function place(i) {
    panes.forEach((p, j) => gsap.set(p, { autoAlpha: j === i ? 1 : 0, xPercent: 0 }));
    apps.forEach((a, j) => a.setActive(j === i));
  }
  function session(from, to) {
    const out = wm(to).startsWith("niri")
      ? ["ayush@stack ~ ❯ hyprctl dispatch exit", "ayush@stack ~ ❯ niri-session"]
      : [
          "ayush@stack ~ ❯ niri msg action quit --skip-confirmation",
          "[  OK  ] Stopped niri compositor.",
          "niri-caelestia-shell archived 2026-06-01. moved on to Hyprland.",
          "ayush@stack ~ ❯ uwsm start hyprland.desktop",
        ];
    const tl = gsap.timeline();
    tl.call(() => (ttyLog.textContent = ""));
    tl.set(tty, { autoAlpha: 1 });
    out.forEach((l, k) => tl.call(() => (ttyLog.textContent += (k ? "\n" : "") + l), null, 0.08 + k * 0.16));
    tl.call(() => place(to), null, 0.12 + out.length * 0.16);
    tl.to(tty, { autoAlpha: 0, duration: 0.4, ease: "power2.out" }, 0.3 + out.length * 0.16);
    return tl;
  }
  function show(i) {
    if (i === idx) return;
    const from = idx;
    idx = i;
    trans?.progress(1);
    if (from < 0 || ctx.reduced) place(i);
    else trans = session(from, i);

    wmCap.textContent = wm(i);
    kittyTitle.textContent = DIRS[i];
    acts.forEach((a, j) => a.classList.toggle("is-on", j === i));
    tabs.forEach((t, j) => t.classList.toggle("is-on", j === i));
    blocks.forEach((b, j) => {
      if (j > i) {
        typing.get(b)?.kill();
        b.classList.remove("is-on");
      }
    });
    // one fish session: earlier projects stay in the scrollback
    for (let j = 0; j <= i; j++) {
      const b = blocks[j];
      if (b.classList.contains("is-on")) continue;
      b.classList.add("is-on");
      if (j === i && from >= 0) typeBlock(b);
      else {
        b.querySelectorAll("[data-text]").forEach((c) => (c.textContent = c.dataset.text));
        gsap.set(b.children, { autoAlpha: 1 });
      }
    }
  }

  const stops = [0, 1];
  const st = pinScene(ctx, pin, 1.4, { onUpdate: (self) => show(Math.round(self.progress * (N - 1))) });
  show(0);
  // the first project types itself out when the scene arrives
  ScrollTrigger.create({ trigger: root, start: "top 55%", once: true, onEnter: () => idx === 0 && typeBlock(blocks[0]) });

  const go = scene(ctx, st, stops, show);
  tabs.forEach((t, i) => t.addEventListener("click", () => go(i)));
  return { st, go, index: () => idx };
}

/* ------------------------------------------------------------------
   3b · Flutter
------------------------------------------------------------------- */
function initDev(ctx) {
  const root = document.querySelector("[data-dev]");
  const pin = root.querySelector(".dev__pin");
  const stageBox = root.querySelector("[data-dev-stage]");
  const device = root.querySelector("[data-device]");
  const chrome = root.querySelector("[data-chrome]");
  const cam = root.querySelector(".device__cam");
  const glare = root.querySelector(".device__glare");
  const spill = root.querySelector("[data-spill]");
  const layers = [...root.querySelectorAll("[data-layer]")];
  const items = [...root.querySelectorAll("[data-item]")];
  const steps = [...root.querySelectorAll(".dev__steps [data-go]")];
  const fills = [...root.querySelectorAll("[data-fill]")];
  const tabs = [...root.querySelectorAll("[data-tab]")];
  const url = root.querySelector("[data-url]");
  const target = root.querySelector("[data-target]");
  const cap = root.querySelector("[data-cap]");

  const apps = layers.map((l) => {
    const viz = l.querySelector("[data-app]");
    return mountApp(viz, APPS[viz.dataset.app], ctx, { manual: true });
  });
  // the song's colour leaves the phone and lights the room around it;
  // CognitoAI lights it in its own pallete.dart cyan
  let songTint = null;
  const tintRoom = (c) => gsap.to(root, { "--tint": c, duration: 0.6, ease: "power1.inOut", overwrite: "auto" });
  layers[0].addEventListener("tint", (e) => {
    songTint = e.detail;
    if (idx === 0) tintRoom(songTint);
  });

  /* geometry: a 360×780 dp phone, and a browser sized for 1200×660 apps */
  const CHROME = 66;
  const g = {};
  function measure() {
    const W = stageBox.clientWidth;
    const H = stageBox.clientHeight - 30; // room for the caption
    const bezel = 10;
    g.ph = Math.min(H, 760);
    g.pw = (g.ph - bezel * 2) * (360 / 780) + bezel * 2;
    // turned sideways the phone is ph wide, so it may need to shrink
    g.turn = Math.min(1, (W * 0.96) / g.ph);
    g.bw = Math.min(W, ((H - CHROME) * 1200) / 660);
    g.bh = (g.bw * 660) / 1200 + CHROME;
  }
  measure();

  // progress marks: hold Musixir · recents · hold CognitoAI · turn · morph ·
  // hold Sage · tab · hold NexVote
  const M = { rec: 0.12, pick: 0.2, full: 0.25, off: 0.42, turn: 0.45, swap: 0.55, open: 0.66, tab: 0.84 };
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  tl.set(device, { width: () => g.pw, height: () => g.ph, rotation: 0, scale: 1, "--pad": "10px", "--r": "46px", "--ch": "0px" }, 0);
  tl.set(chrome, { autoAlpha: 0 }, 0);
  tl.set(layers, { autoAlpha: (i) => (i === 0 ? 1 : 0), scale: 1, xPercent: 0, "--lr": "0px" }, 0);
  // recents: Musixir shrinks to a card and moves aside, CognitoAI's card
  // follows it in from the right and opens to full screen
  const REC = { scale: 0.74, "--lr": "34px" };
  tl.to(layers[0], { ...REC, duration: M.pick - M.rec, ease: "power2.inOut" }, M.rec);
  tl.to(layers[0], { xPercent: -84, duration: M.pick - M.rec, ease: "power2.inOut" }, M.rec + (M.pick - M.rec) * 0.35);
  tl.set(layers[1], { autoAlpha: 1, ...REC, xPercent: 84 }, M.rec + (M.pick - M.rec) * 0.35);
  tl.to(layers[1], { xPercent: 0, duration: (M.pick - M.rec) * 0.65, ease: "power2.inOut" }, M.rec + (M.pick - M.rec) * 0.35);
  tl.to(layers[1], { scale: 1, "--lr": "0px", duration: M.full - M.pick, ease: "power3.out" }, M.pick);
  tl.set(layers[0], { autoAlpha: 0 }, M.full);
  // screen off, light off
  tl.to(layers[1], { autoAlpha: 0, duration: 0.05 }, M.off);
  tl.to(spill, { autoAlpha: 0, duration: 0.08 }, M.off);
  // the phone turns sideways…
  tl.to(device, { rotation: -90, scale: () => g.turn, duration: M.swap - M.turn, ease: "power2.inOut" }, M.turn);
  tl.to(cam, { autoAlpha: 0, duration: 0.04 }, M.swap - 0.04);
  // with the screen dark, a highlight rolls across the glass as it turns
  tl.fromTo(glare, { autoAlpha: 0, "--g": "-60%" }, { autoAlpha: 1, "--g": "40%", duration: (M.swap - M.turn) * 0.6, ease: "sine.in" }, M.turn);
  tl.to(glare, { autoAlpha: 0, "--g": "160%", duration: (M.open - M.turn) * 0.6, ease: "sine.out" }, M.turn + (M.swap - M.turn) * 0.6);
  // …then, where nothing visibly changes, a sideways portrait box becomes an
  // upright landscape one, and it keeps growing into a browser window
  tl.set(device, { rotation: 0, width: () => g.ph, height: () => g.pw }, M.swap);
  tl.to(device, { width: () => g.bw, height: () => g.bh, scale: 1, "--pad": "1px", "--r": "12px", "--ch": `${CHROME}px`, duration: M.open - M.swap, ease: "power2.inOut" }, M.swap);
  tl.to(chrome, { autoAlpha: 1, duration: 0.05 }, M.open - 0.06);
  tl.to(layers[2], { autoAlpha: 1, duration: 0.05 }, M.open - 0.02);
  // tab change: instant, like a browser
  tl.set(layers[2], { autoAlpha: 0 }, M.tab);
  tl.set(layers[3], { autoAlpha: 1 }, M.tab);
  tl.to({}, { duration: 1 - M.tab }, M.tab);

  /* copy, target and caption follow the active app */
  const META = [
    { target: "android", cap: "android · 360×780 dp", url: "" },
    { target: "android", cap: "android · 360×780 dp", url: "" },
    { target: "chrome", cap: "chrome · flutter web", url: "localhost:54213/#/" },
    { target: "chrome", cap: "chrome · flutter web · hardhat :8545", url: "localhost:54217/#/" },
  ];
  let idx = -1;
  function show(i) {
    if (i === idx) return;
    const from = idx;
    idx = i;
    apps.forEach((a, j) => a.setActive(j === i));
    // off screen, CognitoAI waits on its home screen, so that's the card recents shows
    if (i !== 1 && !ctx.reduced) apps[1].tl?.pause(1.9);
    steps.forEach((s, j) => s.classList.toggle("is-on", j === i));
    tabs.forEach((t, j) => t.classList.toggle("is-on", j === Math.max(0, i - 2)));
    if (i === 1) tintRoom("#5fc4dd");
    else if (i === 0 && from === 1 && songTint) tintRoom(songTint);
    url.textContent = META[i].url;
    cap.textContent = META[i].cap;
    if (target.textContent !== META[i].target) swapWord(target, META[i].target);

    // the outgoing title squeezes to its narrowest width, the new one opens out
    items.forEach((it, j) => it.classList.toggle("is-on", j === i));
    if (from < 0 || ctx.reduced) {
      gsap.set(items, { autoAlpha: (j) => (j === i ? 1 : 0) });
      return;
    }
    const out = items[from];
    const inn = items[i];
    gsap.to(out, { autoAlpha: 0, duration: 0.25, overwrite: true });
    gsap.to(out.querySelector("h3"), { "--wd": 50, duration: 0.3, ease: "power2.in", overwrite: true });
    // overwrite: a quick back-and-forth may still be fading this one out
    gsap.set(inn, { autoAlpha: 1, overwrite: true });
    gsap.fromTo(inn.querySelector("h3"), { "--wd": 150, autoAlpha: 0 }, { "--wd": 78, autoAlpha: 1, duration: 0.7, ease: "expo.out", delay: 0.12, overwrite: true });
    gsap.fromTo(inn.querySelectorAll(":scope > :not(h3)"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.04, ease: "power2.out", delay: 0.18, overwrite: true });
  }
  function swapWord(el, word) {
    if (ctx.reduced) return (el.textContent = word);
    const o = { n: el.textContent.length };
    const old = el.textContent;
    gsap.timeline()
      .to(o, { n: 0, duration: 0.18, ease: "none", onUpdate: () => (el.textContent = old.slice(0, Math.round(o.n))) })
      .to(o, { n: word.length, duration: 0.25, ease: "none", onUpdate: () => (el.textContent = word.slice(0, Math.round(o.n))) });
  }

  const clamp = gsap.utils.clamp(0, 1);
  function sync(p) {
    const b = [0, (M.rec + M.pick) / 2, M.off + 0.04, M.tab, 1];
    show(p < b[1] ? 0 : p < b[2] ? 1 : p < b[3] ? 2 : 3);
    fills.forEach((f, i) => f.style.setProperty("--p", clamp((p - b[i]) / (b[i + 1] - b[i]))));
  }
  const stops = [0, 0.33, 0.75, 0.95];
  const st = pinScene(ctx, pin, 3.4, {
    scrub: 0.6,
    animation: tl,
    invalidateOnRefresh: true,
    onRefreshInit: measure,
    onUpdate: (self) => sync(self.progress),
  });
  if (ctx.reduced) {
    root.classList.add("is-static");
    addEventListener("resize", () => (measure(), tl.invalidate().progress(stops[idx])));
  }
  tl.progress(0);
  show(0);

  const go = scene(ctx, st, stops, (i) => {
    tl.progress(stops[i]);
    sync(stops[i]);
  });
  steps.forEach((s, i) => s.addEventListener("click", () => go(i)));
  return { st, go, index: () => idx };
}
