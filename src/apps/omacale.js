import { gsap, $, $$, ms } from "./core.js";
import { calendarHTML, clockParts } from "./niri.js";
import { createBlobRenderer, blobRadii, BlobDeform, hexToVec4 } from "./caelestia/blob.js";
import { EASE, DUR } from "./caelestia/motion.js";
import { shapeSVG, shapePath, wavyArc } from "./caelestia/shapes.js";

/*
  Omacale = Caelestia v2 (Material 3 Expressive), on Omarchy.

  Rebuilt from the plugin running on my laptop (screenshots of each drawer,
  colours sampled from them): Omarchy's Catppuccin Mocha theme, the bridge
  wallpaper, the desktop clock and the cava visualiser along the bottom.
  Panel sizes are the real ones at 1920×1080, so the drawers take the same
  share of the screen they do on the desktop.

  Everything moves the way omacale's modules/drawers/ScreenScope.qml does:
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
const W = 1760;
const H = 880;
const BAR = 54;
const BORDER = 10;
const AX = BAR;
const AY = BORDER;
const AW = W - BAR - BORDER;
const AH = H - BORDER * 2;
const SMOOTH = 20;
const FRAME_R = 25;
const PANEL_R = 28;

// colour roles; "bridge" is sampled from the live desktop (Omarchy's Catppuccin Mocha)
const SCHEMES = {
  bridge: { sf: "#1e1e2e", sfcl: "#232436", sfc: "#2a2b3c", sfch: "#313244", sfchh: "#45475a", on: "#cdd6f4", onv: "#a6adc8", pr: "#89b4fa", onpr: "#11111b", prc: "#a8c3f7", onprc: "#11111b", tert: "#cba6f7", err: "#f38ba8", outl: "#6c7086", outv: "#3a3b4f" },
  eyes: { sf: "#17130c", sfcl: "#1c1811", sfc: "#241f17", sfch: "#2f2921", sfchh: "#3a342b", on: "#ece1d4", onv: "#d3c4b4", pr: "#f6bd5c", onpr: "#422c00", prc: "#ffdea8", onprc: "#2a1a00", tert: "#b6cf8e", err: "#ffb4ab", outl: "#9c8f80", outv: "#4f4539" },
};
const WALLS = ["bridge", "eyes"];
const WALL_NAMES = { bridge: "catppuccin-wallpaper3.png", eyes: "eyes.png" };
const vars = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [`--${k}`, v]));

// Omarchy's mark from omacale's components/Logos.js (1024 grid, y up)
const OMARCHY_GRID = [
  [[70, 70], [549, 70], [549, 0], [0, 0], [0, 1024], [1024, 1024], [1024, 0], [626, 0], [626, 70], [954, 70], [954, 954], [70, 954]],
  [[884, 140], [140, 140], [140, 884], [551, 884], [551, 814], [210, 814], [210, 210], [814, 210], [814, 814], [736, 814], [736, 884], [884, 884]],
  [[471, 140], [549, 140], [549, 70], [471, 70]],
  [[473, 954], [551, 954], [551, 884], [473, 884]],
  [[0, 551], [210, 551], [210, 473], [0, 473]],
];
const OMARCHY_LOGO = `<svg class="ov-logo" viewBox="0 0 1024 1024" aria-hidden="true"><path fill-rule="evenodd" transform="translate(0 1024) scale(1 -1)" d="${OMARCHY_GRID.map((p) => `M${p.map((q) => q.join(" ")).join("L")}Z`).join("")}"/></svg>`;

// launcher rows, with small redraws of each app's icon
const ICON = {
  aether: `<svg viewBox="0 0 40 40"><defs><linearGradient id="ov-ae" x1="0" x2="1"><stop offset="0" stop-color="#36d1dc"/><stop offset=".5" stop-color="#f9d423"/><stop offset="1" stop-color="#ff4e50"/></linearGradient></defs><path d="M20 5 35 34h-7l-8-16-8 16H5z" fill="url(#ov-ae)"/><path d="M14 27h12" stroke="#8a5cf6" stroke-width="4"/></svg>`,
  studio: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#e8f0fe"/><circle cx="20" cy="20" r="12" fill="#4285f4"/><path d="M20 11 27 28h-3.5L20 19l-3.5 9H13z" fill="#fff"/></svg>`,
  basecamp: `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="8" fill="#5bc56a"/><path d="M12 21l6 6 10-13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chromium: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#1a73e8"/><path d="M20 4a16 16 0 0 1 13.9 8H20a8 8 0 0 0-6.9 4L6.1 12A16 16 0 0 1 20 4z" fill="#4c8bf5"/><circle cx="20" cy="20" r="7.5" fill="#fff"/><circle cx="20" cy="20" r="5.5" fill="#1a73e8"/></svg>`,
  cliamp: `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="6" fill="#0d1a0d"/>${[7, 12, 17, 22, 27].map((x, i) => `<rect x="${x + 1}" y="${12 + ((i * 7) % 11)}" width="3" height="${18 - ((i * 7) % 11)}" fill="#62c46a"/>`).join("")}</svg>`,
  neovim: `<svg viewBox="0 0 40 40"><path d="M8 10 15 5v30l-7-5z" fill="#4a9fd8"/><path d="M32 10 25 5v30l7-5z" fill="#62b346"/><path d="M15 5 32 30l-7 5L8 10z" fill="#8bd46e" opacity=".85"/></svg>`,
};
const APPS = [
  ["aether", "Aether", "Desktop theming application"],
  ["studio", "Android Studio", "The official Android IDE"],
  ["basecamp", "Basecamp", "Basecamp"],
  ["chromium", "Chromium", "Access the Internet"],
  ["cliamp", "cliamp", "A retro terminal music player inspired by Winamp 2.x"],
  ["neovim", "Neovim", "Edit text files"],
];

// a ring gauge arc, sweep 0..1 of `deg` degrees, opening at the bottom
const ring = (v, r = 42, deg = 300) => {
  const a0 = ((90 + (360 - deg) / 2) * Math.PI) / 180;
  const a1 = a0 + ((deg * Math.PI) / 180) * Math.max(0.001, v);
  const p = (a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(a0)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
};
// M3 expressive linear progress: a sine wave up to the playhead
const wavyLine = (w, amp, waves, phase) => {
  let d = "";
  for (let i = 0; i <= 60; i++) {
    const x = (w * i) / 60;
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${(6 + Math.sin((i / 60) * waves * Math.PI * 2 + phase) * amp).toFixed(2)}`;
  }
  return d;
};

export default {
  id: "omacale",
  w: W,
  h: H,
  still: 0.3,
  build(stage, ctx) {
    const c = clockParts();
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const weekday = now.toLocaleString("en-US", { weekday: "long" });
    const day = String(now.getDate()).padStart(2, "0");

    stage.innerHTML = `
      <div class="ov-walls"><img data-wall="a" src="/work/wall-bridge.webp" alt="" /><img data-wall="b" alt="" /></div>
      <canvas class="ov-vis" data-vis width="${AW}" height="300"></canvas>
      <div class="ov-dclock">
        <div class="ov-dclock__t"><b data-dh>${c.h}</b><i><s></s><s></s></i><b data-dm>${c.m}</b><sup data-dap>${c.ap}</sup></div>
        <div class="ov-dclock__d"><b>${month.toUpperCase()}</b><strong>${day}</strong><span>${weekday}</span></div>
      </div>
      <canvas class="ov-blob" data-blob></canvas>

      <div class="ov-area">
        <section class="ov-panel ov-dash" data-p="dash">
          <div class="ov-tabs" data-tabs>
            <span class="on">${ms("dashboard", "fill")}Dashboard</span><span>${ms("queue_music")}Media</span><span>${ms("speed")}Performance</span><span>${ms("cloud")}Weather</span>
            <i class="ov-ind" data-ind></i>
          </div>
          <div class="ov-pages"><div class="ov-row" data-row>
            <div class="ov-page ov-grid" data-page>
              <div class="ov-card ov-weather">${ms("clear_day")}<div><b>29°C</b><small>Clear</small></div></div>
              <div class="ov-card ov-user">
                <div class="ov-pill">${shapeSVG("square", "pillbg")}${ms("person_add", "fill")}</div>
                <span class="ov-diamond">${OMARCHY_LOGO}</span>
                <div class="ov-chips"><span class="chip">${ms("select_window")}Hyprland…</span><span class="up"><i class="gem">${shapeSVG("gem")}${ms("timer")}</i>up 4 hours, 47 minut…</span></div>
              </div>
              <div class="ov-card ov-media">
                <div class="ov-cover"><svg viewBox="0 0 100 100" class="wave"><path data-wave d=""/></svg>${shapeSVG("cookie9", "cookie")}${ms("imagesmode")}</div>
                <b>Midnight City</b><small>Hurry Up, We're Dreaming</small><em>M83</em>
                <div class="ov-ctrl"><span>${ms("skip_previous", "fill")}</span><span class="pp" data-pp>${ms("pause", "fill")}</span><span>${ms("skip_next", "fill")}</span></div>
                <img src="/work/bongocat.gif" alt="" class="ov-bongo" />
              </div>
              <div class="ov-card ov-clock"><b data-ch>${c.h}</b><i>•••</i><b data-cm>${c.m}</b><i>•••</i><b data-cs>${c.s}</b><b class="ap">${c.ap}</b></div>
              <div class="ov-card ov-cal">${calendarHTML(`<svg viewBox="0 0 100 100" class="sun"><path d="${shapePath("sunny")}"/></svg>`)}</div>
              <div class="ov-card ov-res">${["memory", "memory_alt", "hard_drive"].map((n, i) => `<div class="g"><svg viewBox="0 0 100 100"><path class="t" d="${ring(1)}"/><path class="v" d="${ring([0.18, 0.7, 0.57][i])}"/></svg>${ms(n)}</div>`).join("")}</div>
            </div>

            <div class="ov-page ov-mediap" data-page>
              <div class="ov-mcover">
                <svg viewBox="0 0 100 100" class="dots"><path data-dots d=""/></svg>
                ${shapeSVG("cookie12", "cookie")}${ms("imagesmode")}
              </div>
              <div class="ov-minfo">
                <b>Midnight City</b><span>M83</span><em>Hurry Up, We're Dreaming</em>
                <div class="ov-prog"><small data-pos>1:58</small><svg viewBox="0 0 150 12"><path data-prog d=""/></svg><i></i><u></u><small>4:03</small></div>
                <div class="ov-mctrl"><span>${ms("shuffle")}</span><span>${ms("skip_previous", "fill")}</span><span class="pp">${ms("pause", "fill")}</span><span>${ms("skip_next", "fill")}</span><span>${ms("repeat")}</span></div>
              </div>
              <div class="ov-lyrics">
                <h6>${ms("lyrics")}Lyrics<i>${ms("more_vert")}</i></h6>
                <div class="ov-nolyr">${ms("sentiment_dissatisfied")}<p>No lyrics found</p></div>
                <div class="ov-player"><span>${ms("library_music")}Spotify</span><i>${ms("expand_more")}</i></div>
              </div>
            </div>

            <div class="ov-page ov-perf" data-page>
              ${[["CPU", "12th Gen Intel Core i5-1240P", "memory", "72°C", 0.72, "6.8%"], ["GPU", "NVIDIA GeForce GTX 1650", "desktop_windows", "58°C", 0.58, "0%"]].map(([t, n, ic, temp, tp, use], i) => `
                <div class="ov-card ov-proc">
                  <span class="ico"><svg viewBox="0 0 100 100"><path class="t" d="${ring(1, 44, 360)}"/><path class="v" d="${ring(tp * 0.4, 44, 360)}"/></svg>${ms(ic)}</span>
                  <div class="nm"><b>${t}</b><small>${n}</small></div>
                  <p class="tmp">${ms("device_thermostat")}${temp}</p>
                  <div class="bar"><i data-tbar="${i}" style="--v:${tp}"></i></div>
                  <div class="use"><small>Usage</small><span class="blob">${shapeSVG("cookie4")}<b data-use="${i}">${use}</b></span></div>
                </div>`).join("")}
              <div class="ov-card ov-batt"><span>${ms("battery_full", "fill")}</span><b>Battery</b><small>Full</small><strong>${ms("bolt", "fill")}100%</strong></div>
              <div class="ov-card ov-store">
                <div class="g"><svg viewBox="0 0 100 100"><path class="t" d="${ring(1, 44, 290)}"/><path class="v" d="${ring(0.571, 44, 290)}"/></svg>${ms("hard_drive")}<b>57.1%</b><small>Used</small></div>
                <div><b>Storage</b><span>84.6 / 148 GiB</span></div>
                <p class="sel"><span>${ms("list")} /</span><i>${ms("expand_more")}</i></p>
              </div>
              <div class="ov-card ov-net">
                <h6>${ms("swap_vert")}Network</h6>
                <svg viewBox="0 0 300 60" preserveAspectRatio="none"><path data-net d="M0 58 L300 58"/></svg>
                <dl><div><dt>${ms("download")}Download</dt><dd data-dl>783 KiB/s</dd></div><div><dt>${ms("upload")}Upload</dt><dd data-ul>45 KiB/s</dd></div><div><dt>${ms("history")}Total</dt><dd class="tot">↓17 GiB ↑2.2 GiB</dd></div></dl>
              </div>
              <div class="ov-card ov-mem">
                <h6>${ms("memory_alt")}Memory</h6>
                <div class="g"><svg viewBox="0 0 100 100"><path class="t" d="${ring(1, 44, 290)}"/><path class="v" d="${ring(0.698, 44, 290)}"/></svg><b>69.8%</b><small>Used</small></div>
                <p>5.2 / 7.5 GiB</p>
              </div>
            </div>
          </div></div>
        </section>

        <section class="ov-panel ov-launch" data-p="launch">
          <ul class="ov-apps" data-apps>${APPS.map(([k, n, d], i) => `<li class="${i === 0 ? "on" : ""}"><span class="ico">${ICON[k]}</span><div><b>${n}</b><small>${d}</small></div></li>`).join("")}</ul>
          <div class="ov-walllist" data-walllist>${WALLS.map((w) => `<figure data-w="${w}"><img src="/work/thumb-${w}.webp" alt="" /><figcaption>${WALL_NAMES[w]}</figcaption></figure>`).join("")}</div>
          <div class="ov-search">${ms("search")}<span data-lq></span><span class="ph" data-lph>Type "&gt;" for commands, ":" for the Omarchy menu</span></div>
        </section>

        <section class="ov-panel ov-session" data-p="session">
          <span class="on">${ms("logout")}</span><span>${ms("power_settings_new")}</span><img src="/work/kurukuru.gif" alt="" /><span>${ms("downloading")}</span><span>${ms("cached")}</span>
        </section>

        <section class="ov-panel ov-osd" data-p="osd">
          <div class="ov-slider"><i data-vol style="--v:.35"></i>${ms("volume_up", "fill")}</div>
          <div class="ov-slider"><i style="--v:.6"></i>${ms("brightness_6", "fill")}</div>
        </section>

        <aside class="ov-panel ov-side" data-p="side">
          <div class="ov-notifs">
            <h4 data-ncount>3 notifications</h4>
            <div class="ov-ng"><span class="ico">${ms("screen_record")}</span><div><p><b>omarchy-action</b><time>4h</time><em>2${ms("expand_more")}</em></p><p><strong>Screen recording saved</strong> Open with Super + Alt + Print…</p><p><strong>Screen recording saved</strong> Open with Super + Alt + Print…</p></div></div>
            <div class="ov-ng"><span class="ico err">${ms("battery_alert")}</span><div><p><b>System</b><time>4h</time><em class="err">1${ms("expand_more")}</em></p><p><strong>Battery low</strong> A critical notification stays…</p></div></div>
            <div class="ov-ng" data-newn><span class="ico">${ms("chat")}</span><div><p><b>Omacale</b><time>now</time><em>1${ms("expand_more")}</em></p><p><strong>Hello from Omacale</strong> A normal notification…</p></div></div>
            <span class="ov-fab">${ms("clear_all")}</span>
          </div>
          <div class="ov-tile"><span class="ico">${ms("coffee")}</span><div><b>Keep awake</b><small>Preventing sleep mode</small></div><span class="ov-switch on" data-switch><i>${ms("check")}</i></span><em>Active since 12:48 PM</em></div>
          <div class="ov-tile ov-rec"><span class="ico">${ms("screen_record")}</span><div><b>Screen recor…</b><small>Ready</small></div><span class="ov-chipbtn">${ms("fit_screen")} Fullscreen<i>${ms("expand_more")}</i></span>
            <p>${ms("list")}Recordings<i>${ms("unfold_more")}</i></p><small class="last">Recording at 2 Oct 2026, 1:16 PM<i>${ms("play_arrow", "fill")}${ms("folder", "fill")}${ms("delete", "fill err")}</i></small></div>
          <div class="ov-qt"><h5>Quick toggles</h5><div>${["wifi", "bluetooth", "mic", "settings", "gamepad", "notifications_off"].map((n, i) => `<span class="${i < 2 ? "on" : ""}">${ms(n, i < 2 ? "fill" : "")}</span>`).join("")}</div></div>
        </aside>
      </div>

      <nav class="ov-bar">
        ${OMARCHY_LOGO}
        <div class="ov-ws" data-ws>
          <b class="ov-wsind" data-wsind></b>
          ${["terminal", "web_asset", "web_asset", "", ""].map((ic) => `<span class="${ic ? "occ" : ""}"><i></i>${ic ? ms(ic) : ""}</span>`).join("")}
        </div>
        <div class="ov-title">${ms("desktop_windows")}<span data-title>Desktop</span></div>
        <div class="ov-bar__low">
          ${ms("calendar_month")}
          <div class="ov-vclock"><span data-h>${c.h}</span><span data-m>${c.m}</span><span>${c.ap.toLowerCase()}</span></div>
          <div class="ov-status">${["coffee", "volume_up", "wifi", "bluetooth", "headphones", "battery_charging_full"].map((n) => ms(n, "fill")).join("")}</div>
          ${ms("power_settings_new", "ov-power")}
        </div>
      </nav>`;

    Object.entries(vars(SCHEMES.bridge)).forEach(([k, v]) => stage.style.setProperty(k, v));

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
    // drawer state: offsets (1 = hidden) and sizes, all tweened. Sizes are
    // the live ones: dashboard 740×462, media 876×368, performance 986×428
    const S = {
      dOff: 1, lOff: 1, sOff: 1, osdOff: 1, sbOff: 1,
      dw: 740, dh: 462, lw: 536, lh: 446, sw: 86, sh: 420, osdW: 66, osdH: 312, sbw: 362,
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
          color: hexToVec4(getComputedStyle(stage).getPropertyValue("--sf").trim() || "#1e1e2e"),
          rects, radii, deforms: defs,
        });
      }
    }
    gsap.ticker.add(frame);

    /* cava along the bottom edge: background/Visualiser.qml draws rounded
       bars in the primary colour; autoHide drops them under open drawers */
    const vis = $(stage, "[data-vis]");
    const vctx = vis.getContext("2d");
    const NB = 150;
    const bars = new Float32Array(NB);
    let vt = 0;
    function drawVis(t) {
      const bw = AW / NB;
      vctx.clearRect(0, 0, vis.width, vis.height);
      vctx.fillStyle = getComputedStyle(stage).getPropertyValue("--pr").trim() || "#89b4fa";
      vctx.globalAlpha = 0.36;
      for (let i = 0; i < NB; i++) {
        // two bands of energy (bass on the left, mids right), mirrored like cava's stereo output
        const x = i / NB;
        const e =
          0.62 * Math.exp(-((x - 0.12) ** 2) / 0.008) * (0.55 + 0.45 * Math.sin(t * 5.1 + i * 0.7)) +
          0.5 * Math.exp(-((x - 0.84) ** 2) / 0.012) * (0.55 + 0.45 * Math.sin(t * 4.3 + i * 1.3)) +
          0.05 * (0.5 + 0.5 * Math.sin(t * 7 + i * 2.1)) +
          0.3 * Math.max(0, Math.sin(t * 2.2 + i * 0.37)) ** 12;
        const target = Math.min(1, e) * vis.height;
        bars[i] += (target - bars[i]) * 0.25;
        const h = Math.max(6, bars[i]);
        const bx = i * bw + 1.5;
        const w = bw - 3;
        vctx.beginPath();
        vctx.roundRect(bx, vis.height - h, w, h + w, w / 2);
        vctx.fill();
      }
    }
    if (ctx?.reduced) {
      for (let i = 0; i < 40; i++) drawVis(i / 30);
    } else {
      gsap.ticker.add(() => {
        if (!visible) return;
        vt += gsap.ticker.deltaRatio() / 60;
        drawVis(vt);
      });
    }

    /* live bits: clocks, wavy media rings, network graph */
    const wave = $(stage, "[data-wave]");
    const dots = $(stage, "[data-dots]");
    const prog = $(stage, "[data-prog]");
    const net = $(stage, "[data-net]");
    const netPts = Array.from({ length: 40 }, (_, i) => (i > 34 ? 10 + (i - 34) * 9 : 2 + Math.random() * 3));
    let ph = 0;
    let netT = 0;
    gsap.ticker.add(() => {
      if (!visible || S.dOff >= 1) return;
      ph += 0.06;
      wave.setAttribute("d", wavyArc(50, 50, 47, Math.PI * 1.08, Math.PI * 1.92, 2.4, 12, ph));
      // the media tab's cover: a ring of dots that ripples with the beat
      let d = "";
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const r = 45 + Math.sin(i * 1.7 + ph * 2) * 2.4 + Math.sin(ph * 3 + i * 0.4) * 1.2;
        const x = 50 + r * Math.cos(a);
        const y = 50 + r * Math.sin(a);
        d += `M${x.toFixed(2)} ${y.toFixed(2)}l0 0`;
      }
      dots.setAttribute("d", d);
      prog.setAttribute("d", wavyLine(96, 2.6, 5, -ph * 1.4));
      if ((netT += 1) % 12 === 0) {
        netPts.shift();
        netPts.push(4 + Math.random() * 52 * (Math.random() > 0.7 ? 1 : 0.25));
        net.setAttribute("d", netPts.map((v, i) => `${i ? "L" : "M"}${(i * 300) / 39} ${(58 - v).toFixed(1)}`).join(""));
      }
    });
    const setText = (sel, v) => $$(stage, sel).forEach((el) => (el.textContent = v));
    setInterval(() => {
      const t = clockParts();
      setText("[data-h], [data-ch], [data-dh]", t.h);
      setText("[data-m], [data-cm], [data-dm]", t.m);
      setText("[data-cs]", t.s);
    }, 1000);

    /* ------------------------------------------------------------ script */
    const tabs = $$(stage, "[data-tabs] > span");
    const ind = $(stage, "[data-ind]");
    const row = $(stage, "[data-row]");
    const pages = $$(stage, "[data-page]");
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
    const wsInd = $(stage, "[data-wsind]");
    const wsSlots = $$(stage, "[data-ws] > span");
    const newN = $(stage, "[data-newn]");
    const nCount = $(stage, "[data-ncount]");
    let wallIdx = 0;

    const sp = { duration: DUR.spatial, ease: EASE.spatial }; // Anim {} in omacale
    // tab change: the indicator slides, the page row scrolls and the drawer
    // resizes to the new page in one spatial spring
    const SIZES = [
      [740, 462],
      [876, 368],
      [986, 428],
    ];
    const tab = (i, at) => {
      tl.call(() => {
        const t = tabs[i];
        tabs.forEach((x, j) => x.classList.toggle("on", j === i));
        gsap.to(ind, { x: t.offsetLeft + t.offsetWidth / 2 - 30, ...sp });
        gsap.to(row, { x: -pages[i].offsetLeft, duration: DUR.normal, ease: EASE.standard });
      }, null, at);
      tl.to(S, { dw: SIZES[i][0], dh: SIZES[i][1], ...sp }, at);
    };
    const setQuery = (txt) => {
      lq.textContent = txt;
      lph.style.opacity = txt ? 0 : 1;
    };
    // the active workspace pill (bar/workspaces/ActiveIndicator.qml) slides on fastSpatial
    const ws = (i) => {
      wsSlots.forEach((s, j) => s.classList.toggle("on", j === i));
      gsap.to(wsInd, { y: wsSlots[i].offsetTop, height: wsSlots[i].offsetHeight, duration: DUR.fastSpatial, ease: EASE.fastSpatial });
    };

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      tabs.forEach((x, j) => x.classList.toggle("on", j === 0));
      gsap.set(ind, { x: tabs[0].offsetLeft + tabs[0].offsetWidth / 2 - 30 });
      gsap.set(row, { x: 0 });
      Object.assign(S, { dw: SIZES[0][0], dh: SIZES[0][1], lw: 536, lh: 446 });
      apps.style.display = "";
      walllist.style.display = "";
      setQuery("");
      sw.classList.add("on");
      newN.style.display = "none";
      nCount.textContent = "2 notifications";
      ws(1);
    }, null, 0.001);

    // 1 · volume key: OSD slides out of the right frame edge
    tl.to(S, { osdOff: 0, ...sp }, 0.3);
    tl.fromTo(vol, { "--v": 0.35 }, { "--v": 0.78, duration: 0.9, ease: EASE.standard }, 0.7);
    tl.to(S, { osdOff: 1, ...sp }, 2.1);

    // 2 · dashboard drops out of the top edge, then Media, then Performance
    tl.to(S, { dOff: 0, ...sp }, 2.3);
    tl.call(() => pp.classList.toggle("on"), null, 3.4);
    tab(1, 4.3);
    tab(2, 6.3);
    tl.fromTo($$(stage, "[data-tbar]"), { "--v": 0.3 }, { "--v": (i) => [0.72, 0.58][i], duration: 0.8, ease: EASE.standard }, 6.5);
    tl.to(S, { dOff: 1, ...sp }, 8.6);

    // 3 · SUPER+3: the workspace pill moves; a notification lands, the
    //     sidebar opens and pushes the session menu inward (ScreenScope sShift)
    tl.call(() => ws(2), null, 8.9);
    tl.to(S, { sOff: 0, ...sp }, 9.3);
    tl.call(() => {
      newN.style.display = "";
      nCount.textContent = "3 notifications";
      gsap.fromTo(newN, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: DUR.spatial, ease: EASE.spatial });
    }, null, 9.9);
    tl.to(S, { sbOff: 0, ...sp }, 10.1);
    tl.call(() => sw.classList.toggle("on"), null, 11.0);
    tl.call(() => sw.classList.toggle("on"), null, 11.6);
    tl.to(S, { sOff: 1, ...sp }, 12.2);
    tl.to(S, { sbOff: 1, ...sp }, 12.5);
    tl.call(() => ws(1), null, 12.7);

    // 4 · launcher → ">wallpaper" → pick → the scheme regenerates
    tl.to(S, { lOff: 0, ...sp }, 13.0);
    ">wallpaper".split("").forEach((_, i) => tl.call(() => setQuery(">wallpaper".slice(0, i + 1)), null, 13.7 + i * 0.07));
    tl.call(() => {
      apps.style.display = "none";
      walllist.style.display = "flex";
      const cur = WALLS[wallIdx];
      figs.forEach((f) => f.classList.toggle("on", f.dataset.w === cur));
    }, null, 14.5);
    tl.to(S, { lw: 900, lh: 250, ...sp }, 14.5);
    tl.call(() => {
      const next = WALLS[(wallIdx + 1) % WALLS.length];
      figs.forEach((f) => f.classList.toggle("on", f.dataset.w === next));
    }, null, 15.5);
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
    }, null, 16.3);
    tl.to(S, { lOff: 1, ...sp }, 17.4);
    tl.to({}, { duration: 0.8 });

    // static frame for reduced motion: the dashboard and sidebar, open
    if (ctx?.reduced) Object.assign(S, { dOff: 0, sbOff: 0 });
    return tl;
  },
};
