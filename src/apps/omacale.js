import { gsap, $, $$, ms } from "./core.js";
import { CAELESTIA_LOGO, calendarHTML, clockParts } from "./niri.js";
import { createBlobRenderer, blobRadii, BlobDeform, hexToVec4 } from "./caelestia/blob.js";
import { EASE, DUR } from "./caelestia/motion.js";
import { shapeSVG, shapePath, wavyArc } from "./caelestia/shapes.js";

/*
  Omacale = Caelestia v2 (Material 3 Expressive), on Omarchy.

  Everything here follows omacale's modules/drawers/ScreenScope.qml:
  - one SDF "blob" surface (WebGL port of shaders/blob.frag) draws the
    frame and every drawer, merged with circular smooth-mins
  - drawer rects use ScreenScope's geometry (dy = ay + (-dh - 5) * dOff …)
    and offsets animate with Anim's default: expressive DefaultSpatial,
    500ms, bezier(0.38, 1.21, 0.22, 1), which overshoots
  - each drawer has a BlobDeform spring (amounts from ScreenScope) that
    stretches it along its motion; its content gets the same matrix
  - tokens: frame 10px, frame rounding 25, smoothing 20, drawer radius 28
  The loop ends in the launcher's wallpaper picker: picking a wallpaper
  regenerates the Material 3 scheme and the whole shell re-tints.
*/
const W = 1300;
const H = 650;
const BAR = 50;
const BORDER = 10;
const AX = BAR;
const AY = BORDER;
const AW = W - BAR - BORDER;
const AH = H - BORDER * 2;
const SMOOTH = 20;
const FRAME_R = 25;
const PANEL_R = 28;

const SCHEMES = {
  eyes: { sf: "#17130c", sfcl: "#1f1b13", sfc: "#241f17", sfch: "#2f2921", sfchh: "#3a342b", on: "#ece1d4", onv: "#d3c4b4", pr: "#f6bd5c", onpr: "#422c00", prc: "#5f4100", onprc: "#ffdea8", tert: "#b6cf8e", outl: "#9c8f80", outv: "#4f4539" },
  island: { sf: "#111318", sfcl: "#191c20", sfc: "#1d2024", sfch: "#282a2f", sfchh: "#33353a", on: "#e2e2e9", onv: "#c4c6d0", pr: "#a8c8ff", onpr: "#05305f", prc: "#254777", onprc: "#d5e3ff", tert: "#dbbce1", outl: "#8e9099", outv: "#44474e" },
};
const WALLS = ["eyes", "island"];
const WALL_NAMES = { eyes: "eyes.png", island: "island-night-moon.jpg" };
const vars = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [`--${k}`, v]));

const APPS = [
  ["Aether", "Desktop theming application", "#c48bff"],
  ["Alacritty", "A fast, cross-platform, OpenGL terminal emulator", "#e8562a"],
  ["Chromium", "Access the Internet", "#4c8bf5"],
  ["cliamp", "A retro terminal music player inspired by Winamp 2.x", "#62c46a"],
  ["Neovim", "Edit text files", "#57a143"],
];

// a ring gauge arc (performance), sweep 0..1 of 300°
const ring = (v, r = 42) => {
  const a0 = (120 * Math.PI) / 180;
  const a1 = a0 + ((300 * Math.PI) / 180) * v;
  const p = (a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
};

export default {
  id: "omacale",
  w: W,
  h: H,
  still: 0.3,
  build(stage, ctx) {
    const c = clockParts();
    stage.innerHTML = `
      <div class="ov-walls"><img data-wall="a" src="/work/wall-eyes.webp" alt="" /><img data-wall="b" alt="" /></div>
      <div class="ov-bigclock" data-big>${c.h}</div>
      <canvas class="ov-blob" data-blob></canvas>

      <div class="ov-area">
        <section class="ov-panel ov-dash" data-p="dash">
          <div class="ov-tabs" data-tabs>
            <span class="on">${ms("dashboard", "fill")}Dashboard</span><span>${ms("queue_music")}Media</span><span>${ms("speed")}Performance</span><span>${ms("cloud")}Weather</span>
            <i class="ov-ind" data-ind></i>
          </div>
          <div class="ov-pages"><div class="ov-row" data-row>
            <div class="ov-page ov-grid" data-page="0">
              <div class="ov-card ov-weather">${ms("dark_mode")}<div><b>26°C</b><small>Clear</small></div></div>
              <div class="ov-card ov-user">
                <div class="ov-pill">${shapeSVG("square", "pillbg")}${ms("person", "fill")}</div>
                <span class="ov-diamond">${shapeSVG("diamond")}${ms("desktop_windows")}</span>
                <div class="ov-chips"><span class="chip">${ms("desktop_windows")}Hyprland…</span><span class="up"><i class="gem">${shapeSVG("gem")}${ms("refresh")}</i>up 2 hours, 30 minut…</span></div>
              </div>
              <div class="ov-card ov-media">
                <div class="ov-cover"><svg viewBox="0 0 100 100" class="wave"><path data-wave d=""/></svg>${shapeSVG("cookie9", "cookie")}${ms("image")}</div>
                <b>Suits - s3 e11 Wa…</b><small>Unknown album</small><em>Unknown artist</em>
                <div class="ov-ctrl"><span>${ms("skip_previous", "fill")}</span><span class="pp" data-pp>${ms("pause", "fill")}</span><span>${ms("skip_next", "fill")}</span></div>
                <img src="/work/bongocat.gif" alt="" class="ov-bongo" />
              </div>
              <div class="ov-card ov-clock"><b data-ch>${c.h}</b><i>•••</i><b data-cm>${c.m}</b><i>•••</i><b data-cs>${c.s}</b><b class="ap" data-cap>${c.ap}</b></div>
              <div class="ov-card ov-cal">${calendarHTML(`<svg viewBox="0 0 100 100" class="sun"><path d="${shapePath("sunny")}"/></svg>`)}</div>
              <div class="ov-card ov-res">${["memory", "developer_board", "storage"].map((n, i) => `<div class="g"><svg viewBox="0 0 100 100"><path class="t" d="${ring(1)}"/><path class="v" data-rv="${[0.32, 0.64, 0.5][i]}" d="${ring([0.32, 0.64, 0.5][i])}"/></svg>${ms(n)}</div>`).join("")}</div>
            </div>
            <div class="ov-page ov-perf" data-page="2">
              ${[["54°C", "GPU temp", 0.54, "4%", "usage"], ["41°C", "CPU temp", 0.41, "9%", "usage"], ["5.4GiB", "Memory", 0.35, "15.5GiB", "total"]].map(([v, l, p, s, sl]) => `
                <div class="ov-big"><svg viewBox="0 0 100 100"><path class="t" d="${ring(1, 44)}"/><path class="v" d="${ring(p, 44)}"/></svg><b>${v}</b><small>${l}</small><em>${s} <i>${sl}</i></em></div>`).join("")}
            </div>
          </div></div>
        </section>

        <section class="ov-panel ov-launch" data-p="launch">
          <ul class="ov-apps" data-apps>${APPS.map(([n, d, col], i) => `<li class="${i === 0 ? "on" : ""}"><span class="ico" style="--c:${col}">${n[0]}</span><div><b>${n}</b><small>${d}</small></div></li>`).join("")}</ul>
          <div class="ov-walllist" data-walllist>${WALLS.map((w) => `<figure data-w="${w}"><img src="/work/thumb-${w}.webp" alt="" /><figcaption>${WALL_NAMES[w]}</figcaption></figure>`).join("")}</div>
          <div class="ov-search">${ms("search")}<span data-lq></span><span class="ph" data-lph>Type "&gt;" for commands, ":" for the Omarchy menu</span></div>
        </section>

        <section class="ov-panel ov-session" data-p="session">${["logout", "power_settings_new", "download", "refresh"].map((n, i) => `<span class="${i === 0 ? "on" : ""}">${ms(n)}</span>`).join("")}<img src="/work/kurukuru.gif" alt="" /></section>

        <section class="ov-panel ov-osd" data-p="osd">
          <div class="ov-slider"><i data-vol style="--v:.35"></i>${ms("volume_up", "fill")}</div>
          <div class="ov-slider"><i style="--v:.6"></i>${ms("brightness_6", "fill")}</div>
        </section>

        <aside class="ov-panel ov-side" data-p="side">
          <div class="ov-notifs"><h4>Notifications</h4><img src="/work/dino.webp" alt="" /><p>All up to date!</p></div>
          <div class="ov-tile"><span class="ico">${ms("coffee", "fill")}</span><div><b>Keep awake</b><small>Preventing sleep mode</small></div><span class="ov-switch on" data-switch><i>${ms("check")}</i></span><em>Active since 11:07 PM</em></div>
          <div class="ov-tile"><span class="ico">${ms("screen_record")}</span><div><b>Screen recorder</b><small>Ready</small></div><span class="ov-chipbtn">${ms("fullscreen")} Fullscreen</span></div>
          <div class="ov-qt"><h5>Quick toggles</h5><div>${["wifi", "bluetooth", "mic", "settings", "do_not_disturb_on", "notifications"].map((n, i) => `<span class="${i < 2 ? "on" : ""}">${ms(n, i < 2 ? "fill" : "")}</span>`).join("")}</div></div>
        </aside>
      </div>

      <nav class="ov-bar">
        ${CAELESTIA_LOGO}
        <div class="ov-ws"><i></i><i></i><b data-wsind></b><i></i><i></i></div>
        <div class="ov-title">${ms("desktop_windows")}<span>Desktop</span></div>
        <div class="ov-bar__low">
          ${ms("calendar_month")}
          <div class="ov-vclock"><span data-h>${c.h}</span><span data-m>${c.m}</span></div>
          <div class="ov-status">${ms("coffee", "fill")}${ms("volume_up", "fill")}${ms("wifi", "fill")}${ms("bluetooth")}</div>
          ${ms("power_settings_new", "ov-power")}
        </div>
      </nav>`;

    Object.entries(vars(SCHEMES.eyes)).forEach(([k, v]) => stage.style.setProperty(k, v));

    /* ------------------------------------------------------------ engine */
    const canvas = $(stage, "[data-blob]");
    let renderer = null;
    try {
      renderer = createBlobRenderer(canvas);
    } catch (e) {
      console.warn("blob shader unavailable", e);
    }
    if (!renderer) stage.classList.add("ov-noGL");

    const P = Object.fromEntries($$(stage, "[data-p]").map((el) => [el.dataset.p, el]));
    // drawer state: offsets (1 = hidden) and sizes, all tweened
    const S = {
      dOff: 1, lOff: 1, sOff: 1, osdOff: 1, sbOff: 1,
      dw: 760, dh: 506, lw: 620, lh: 372, sw: 92, sh: 352, osdW: 66, osdH: 312, sbw: 330,
    };
    const deform = {
      dash: new BlobDeform(0.1), launch: new BlobDeform(0.1), session: new BlobDeform(0.2),
      side: new BlobDeform(0.03), osd: new BlobDeform(0.25),
    };

    function geometry() {
      const sbVis = S.sbOff < 1;
      const sVis = S.sOff < 1;
      const g = {};
      g.dash = [AX + Math.round((AW - S.dw) / 2), AY + (-S.dh - 5) * S.dOff, S.dw, S.dh, S.dOff];
      g.launch = [AX + Math.round((AW - S.lw) / 2), AY + AH - S.lh + (S.lh + 5) * S.lOff, S.lw, S.lh, S.lOff];
      g.side = [AX + AW - S.sbw + (S.sbw + 5) * S.sbOff, AY, S.sbw, AH, S.sbOff];
      const sShift = sbVis ? S.sbw * (1 - S.sbOff) : 0;
      const sHide = S.sw + 5 + (sbVis ? 14 : 0);
      g.session = [AX + AW - sShift - S.sw + sHide * S.sOff, AY + Math.round((AH - S.sh) / 2), S.sw, S.sh, S.sOff];
      const osdShift = sShift + (sVis ? S.sw * (1 - S.sOff) : 0);
      const osdHide = S.osdW + 5 + (sbVis || sVis ? 12 : 0);
      g.osd = [AX + AW - osdShift - S.osdW + osdHide * S.osdOff, AY + Math.round((AH - S.osdH) / 2), S.osdW, S.osdH, S.osdOff];
      return g;
    }

    let visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);
    let last = performance.now();
    const order = ["dash", "launch", "session", null, null, null, "side", null, null, "osd"];
    function frame() {
      if (!visible) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = geometry();
      const rects = order.map((k) => (k && g[k][4] < 1 ? g[k].slice(0, 4) : null));
      const radii = blobRadii(rects, PANEL_R, [AX, AY, AW, AH], SMOOTH);
      const defs = order.map((k) => {
        if (!k) return null;
        const [x, y, w, h] = g[k];
        return deform[k].step(x + w / 2, y + h / 2, dt);
      });
      for (const k of Object.keys(g)) {
        const [x, y, w, h, off] = g[k];
        const el = P[k];
        el.style.visibility = off < 1 ? "visible" : "hidden";
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.transform = `translate(${x}px, ${y}px) ${deform[k].css()}`;
      }
      if (renderer) {
        const k = stage.getBoundingClientRect().width / W;
        renderer.draw({
          w: W, h: H,
          scale: Math.min(2, Math.max(0.5, k * (devicePixelRatio || 1))),
          smoothing: SMOOTH, holeRadius: FRAME_R, hole: [AX, AY, AW, AH],
          color: hexToVec4(getComputedStyle(stage).getPropertyValue("--sf").trim() || "#17130c"),
          rects, radii, deforms: defs,
        });
      }
    }
    gsap.ticker.add(frame);

    /* live bits: clocks, wavy media ring */
    const wave = $(stage, "[data-wave]");
    let ph = 0;
    gsap.ticker.add(() => {
      if (!visible || S.dOff >= 1) return;
      ph += 0.06;
      wave.setAttribute("d", wavyArc(50, 50, 47, Math.PI * 1.08, Math.PI * 1.92, 2.4, 12, ph));
    });
    setInterval(() => {
      const t = clockParts();
      $(stage, "[data-h]").textContent = t.h;
      $(stage, "[data-m]").textContent = t.m;
      $(stage, "[data-ch]").textContent = t.h;
      $(stage, "[data-cm]").textContent = t.m;
      $(stage, "[data-cs]").textContent = t.s;
      $(stage, "[data-big]").textContent = t.h;
    }, 1000);

    /* ------------------------------------------------------------ script */
    const tabs = $$(stage, "[data-tabs] > span");
    const ind = $(stage, "[data-ind]");
    const row = $(stage, "[data-row]");
    const apps = $(stage, "[data-apps]");
    const walllist = $(stage, "[data-walllist]");
    const figs = $$(stage, "[data-walllist] figure");
    const lq = $(stage, "[data-lq]");
    const lph = $(stage, "[data-lph]");
    const vol = $(stage, "[data-vol]");
    const sw = $(stage, "[data-switch]");
    const wallA = $(stage, '[data-wall="a"]');
    const wallB = $(stage, '[data-wall="b"]');
    const pp = $(stage, "[data-pp]");
    let wallIdx = 0;

    const sp = { duration: DUR.spatial, ease: EASE.spatial }; // Anim {} in omacale
    const tab = (i) => {
      const t = tabs[i];
      tabs.forEach((x, j) => x.classList.toggle("on", j === i));
      gsap.to(ind, { x: t.offsetLeft + t.offsetWidth / 2 - 30, ...sp });
    };
    const setQuery = (txt) => {
      lq.textContent = txt;
      lph.style.opacity = txt ? 0 : 1;
    };

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      tab(0);
      gsap.set(row, { x: 0 });
      Object.assign(S, { dw: 760, dh: 506, lw: 620, lh: 372 });
      apps.style.display = "";
      walllist.style.display = "";
      setQuery("");
      sw.classList.add("on");
    }, null, 0.001);

    // 1 · volume key: OSD slides out of the right frame edge
    tl.to(S, { osdOff: 0, ...sp }, 0.3);
    tl.fromTo(vol, { "--v": 0.35 }, { "--v": 0.78, duration: 0.9, ease: EASE.standard }, 0.7);
    tl.to(S, { osdOff: 1, ...sp }, 2.1);

    // 2 · dashboard drops out of the top edge, then morphs to Performance
    tl.to(S, { dOff: 0, ...sp }, 2.3);
    tl.call(() => pp.classList.toggle("on"), null, 3.6);
    tl.call(() => tab(2), null, 4.6);
    tl.to(row, { x: -760, duration: DUR.normal, ease: EASE.standard }, 4.6);
    tl.to(S, { dw: 700, dh: 300, ...sp }, 4.6);
    tl.to(S, { dOff: 1, ...sp }, 6.6);

    // 3 · session menu, then the sidebar pushes it inward (ScreenScope sShift)
    tl.to(S, { sOff: 0, ...sp }, 7.0);
    tl.to(S, { sbOff: 0, ...sp }, 8.0);
    tl.call(() => sw.classList.toggle("on"), null, 9.0);
    tl.call(() => sw.classList.toggle("on"), null, 9.6);
    tl.to(S, { sOff: 1, ...sp }, 10.2);
    tl.to(S, { sbOff: 1, ...sp }, 10.5);

    // 4 · launcher → ">wallpaper" → pick → the scheme regenerates
    tl.to(S, { lOff: 0, ...sp }, 11.0);
    ">wallpaper".split("").forEach((_, i) => tl.call(() => setQuery(">wallpaper".slice(0, i + 1)), null, 11.7 + i * 0.07));
    tl.call(() => {
      apps.style.display = "none";
      walllist.style.display = "flex";
      const cur = WALLS[wallIdx];
      figs.forEach((f) => f.classList.toggle("on", f.dataset.w === cur));
    }, null, 12.5);
    tl.to(S, { lw: 900, lh: 250, ...sp }, 12.5);
    tl.call(() => {
      const next = WALLS[(wallIdx + 1) % WALLS.length];
      figs.forEach((f) => f.classList.toggle("on", f.dataset.w === next));
    }, null, 13.5);
    tl.call(() => {
      wallIdx = (wallIdx + 1) % WALLS.length;
      const w = WALLS[wallIdx];
      // crossfade the wallpaper and tween every colour role to the new scheme
      wallB.src = `/work/wall-${w}.webp`;
      gsap.fromTo(wallB, { opacity: 0 }, {
        opacity: 1, duration: 0.8, ease: "power1.inOut",
        onComplete: () => { wallA.src = wallB.src; gsap.set(wallB, { opacity: 0 }); },
      });
      gsap.to(stage, { ...vars(SCHEMES[w]), duration: 0.9, ease: "power1.inOut" });
    }, null, 14.3);
    tl.to(S, { lOff: 1, ...sp }, 15.4);
    tl.to({}, { duration: 0.8 });

    // static frame for reduced motion
    if (ctx?.reduced) Object.assign(S, { dOff: 0, sbOff: 0 });
    return tl;
  },
};
