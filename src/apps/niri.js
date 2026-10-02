import { gsap, $, $$, ms } from "./core.js";
import { EASE, DUR } from "./caelestia/motion.js";

/*
  niri-caelestia-shell = Caelestia v1, ported to niri.

  Rebuilt from the fork's QML. Colours.qml gives the default M3 palette,
  AppearanceConfig.qml gives Rubik and rounding 12/17/25, and the dashboard
  tabs come from Tabs.qml, Dash.qml and NiriThing.qml. The wallpaper ships
  in images/Wallpapers.

  v1 motion, exactly as in the QML:
  - drawers are frame-coloured ShapePaths (dashboard/Background.qml): the
    body plus a concave fillet each side, radii flattening while short
  - the dashboard's height grows from 0 (Wrapper.qml: emphasizedDecel 600ms
    in, emphasizedAccel 400ms out) with its content anchored to the bottom
  - tab change: content slides (contentX, standard 400ms) while the drawer
    morphs to the new page size (emphasized 600ms)
  - launcher height (emphasizedDecel 400 / accel 200), OSD width
    (emphasizedDecel 200 / accel 100)
*/
const LOGO = `<svg viewBox="0 0 32 32" class="cl-logo"><g fill="currentColor"><path transform="matrix(1.2563133,0,0,1.2563133,-3.8901453,-4.2534157)" d="m 20.024092,13.797643 c 5.47,1.72 3.637949,9.84999 -2.003111,11.839946 -6.229996,2.19771 -10.467982,-0.0805 -10.467982,-0.0805 5.786947,4.075289 12.5354,2.977619 16.377338,-0.558406 4.37927,-4.030571 3.747629,-12.313964 -0.896376,-14.76628 -6.135656,-3.239997 -10.749869,1.68524 -9.329869,5.57524 -0.42,-1.59 0.525599,-4.614534 3.531223,-4.803537 1.970434,-0.123907 3.044017,1.457686 2.788777,2.793537 z"/><path transform="matrix(-1.2563133,0,0,-1.2563133,35.933366,36.359532)" d="m 20.024092,13.797643 c 5.47,1.72 3.637949,9.84999 -2.003111,11.839946 -6.229996,2.19771 -10.467982,-0.0805 -10.467982,-0.0805 5.786947,4.075289 12.5354,2.977619 16.377338,-0.558406 4.37927,-4.030571 3.747629,-12.313964 -0.896376,-14.76628 -6.135656,-3.239997 -10.749869,1.68524 -9.329869,5.57524 -0.42,-1.59 0.525599,-4.614534 3.531223,-4.803537 1.970434,-0.123907 3.044017,1.457686 2.788777,2.793537 z"/></g></svg>`;
export { LOGO as CAELESTIA_LOGO };

const APPS = [
  ["Alacritty", "A fast, cross-platform, OpenGL terminal emulator", "terminal", "#e8562a"],
  ["Ark", "Work with file archives", "storage", "#cfd8dc"],
  ["btop++", "Resource monitor that shows usage and stats for processor, memory, disks…", "speed", "#e53935"],
  ["Firefox", "Browse the World Wide Web", "apps", "#ff7a1a"],
  ["Kitty", "Fast, feature-rich, GPU based terminal", "terminal", "#9a7cf0"],
  ["Nautilus", "Access and organize files", "storage", "#5ea0ef"],
];

export function calendarHTML(todayShape = "") {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = first - 1; i >= 0; i--) cells.push(`<span class="dim">${prev - i}</span>`);
  for (let d = 1; d <= days; d++)
    cells.push(d === now.getDate() ? `<span class="today">${todayShape}<b>${d}</b></span>` : `<span>${d}</span>`);
  for (let d = 1; cells.length < 42; d++) cells.push(`<span class="dim">${d}</span>`);
  const month = now.toLocaleString("en-US", { month: "long" });
  return `<div class="cl-cal__head">${ms("chevron_left")}<b>${month} ${y}</b>${ms("chevron_right")}</div>
    <div class="cl-cal__grid">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<em>${d}</em>`).join("")}${cells.join("")}</div>`;
}

export function clockParts() {
  const d = new Date();
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const p = (n) => String(n).padStart(2, "0");
  return { h: p(h), m: p(d.getMinutes()), s: p(d.getSeconds()), ap };
}

const W = 1280;
const H = 640;
const AX = 56;
const AY = 10;
const AW = W - AX - 10;
const AH = H - 20;
const R = 25; // Config.border.rounding (Appearance.rounding.large)

/* v1 drawer outline, from dashboard/Background.qml. Built in edge-local
   coords (u along the frame edge, v into the screen) and mapped per edge. */
function drawerPath(len, depth, map, mirror) {
  if (depth < 0.5) return "";
  const r = R;
  const ry = depth < r * 2 ? depth / 2 : r;
  const rad = Math.min(r, depth);
  const cw = mirror ? 0 : 1; // QML Clockwise; mirroring an edge flips it
  const ccw = 1 - cw;
  const P = (u, v) => map(u, v).map((n) => n.toFixed(2)).join(" ");
  return (
    `M${P(-r, 0)}` +
    `A${r} ${rad} 0 0 ${cw} ${P(0, ry)}` +
    `L${P(0, depth - ry)}` +
    `A${r} ${rad} 0 0 ${ccw} ${P(r, depth)}` +
    `L${P(len - r, depth)}` +
    `A${r} ${rad} 0 0 ${ccw} ${P(len, depth - ry)}` +
    `L${P(len, ry)}` +
    `A${r} ${rad} 0 0 ${cw} ${P(len + r, 0)}Z`
  );
}
const topEdge = (x0) => (u, v) => [x0 + u, AY + v];
const bottomEdge = (x0) => (u, v) => [x0 + u, AY + AH - v];
const rightEdge = (y0) => (u, v) => [AX + AW - v, y0 + u];

const FRAME =
  `M0 0H${W}V${H}H0Z ` +
  `M${AX + R} ${AY}H${AX + AW - R}A${R} ${R} 0 0 1 ${AX + AW} ${AY + R}V${AY + AH - R}A${R} ${R} 0 0 1 ${AX + AW - R} ${AY + AH}` +
  `H${AX + R}A${R} ${R} 0 0 1 ${AX} ${AY + AH - R}V${AY + R}A${R} ${R} 0 0 1 ${AX + R} ${AY}Z`;

export default {
  id: "niri",
  w: W,
  h: H,
  still: 0.25,
  build(stage) {
    const c = clockParts();
    stage.innerHTML = `
      <img class="cl-wall" src="work/wall-island.webp" alt="" />
      <div class="cl-dclock" data-dclock>${c.h}:${c.m}:${c.s} ${c.ap}</div>
      <svg class="v1-surface" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <path class="frame" fill-rule="evenodd" d="${FRAME}"/>
        <path data-sp="dash"/><path data-sp="launch"/><path data-sp="osd"/>
      </svg>

      <nav class="cl-bar">
        ${LOGO}
        <div class="cl-ws"><i>${ms("terminal")}</i><i>${ms("apps")}</i><b data-ws>3</b></div>
        <div class="cl-act">${ms("desktop_windows")}</div>
        <div class="cl-bar__low">
          ${ms("calendar_month")}
          <div class="cl-vclock"><span data-h>${c.h}</span><span data-m>${c.m}</span><span data-ap>${c.ap}</span></div>
          <div class="cl-status">${ms("wifi", "fill")}${ms("bluetooth")}${ms("headphones", "fill")}${ms("battery_full", "fill")}</div>
          ${ms("power_settings_new", "cl-power")}
        </div>
      </nav>

      <section class="v1-drawer" data-d="dash"><div class="v1-in v1-dash" data-dashin>
        <div class="cl-tabs" data-tabs>
          <span class="on">${ms("dashboard", "fill")}Dashboard</span><span>${ms("queue_music")}Media</span><span>${ms("speed")}Performance</span><span>${ms("cloud")}Weather</span><span>${ms("workspaces", "fill")}Niri</span>
          <i class="cl-tabs__ind" data-ind></i>
        </div>
        <div class="v1-view" data-view><div class="v1-row" data-row>
          <div class="cl-dashgrid">
            <div class="cl-card cl-weather">${ms("partly_cloudy_day")}<div><b>10°C</b><small>Partly cloudy</small></div></div>
            <div class="cl-card cl-user"><span class="cl-pfp">${ms("person", "fill")}</span><ul><li>${ms("terminal")}: CachyOS</li><li>${ms("desktop_windows")}: niri</li><li>${ms("speed")}: up 9 hours, 51 minutes</li></ul></div>
            <div class="cl-card cl-media">
              <div class="cl-cover"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="trk"/><circle cx="50" cy="50" r="46" class="prg" data-arc/></svg>${ms("image")}</div>
              <b>The K2 Episode 13 | …</b><small>Unknown album</small><em>Unknown artist</em>
              <div class="cl-ctrl">${ms("skip_previous", "fill")}${ms("play_arrow", "fill")}${ms("skip_next", "fill")}</div>
              <img src="work/bongocat.gif" alt="" class="cl-bongo" />
            </div>
            <div class="cl-card cl-clock"><b data-ch>${c.h}</b><i>•••</i><b data-cm>${c.m}</b><b class="ap" data-cap>${c.ap}</b></div>
            <div class="cl-card cl-cal">${calendarHTML()}</div>
            <div class="cl-card cl-perf"><div><i style="--v:.06" data-pf></i>${ms("memory")}</div><div><i style="--v:.42" data-pf></i>${ms("developer_board")}</div><div><i style="--v:.36" class="t" data-pf></i>${ms("storage")}</div></div>
          </div>
          <div class="cl-niri">
            <div class="cl-group"><header>Move Window to Workspace <span>${ms("expand_more")}</span></header>
              <div class="cl-pills" data-pills><span>Workspace 1</span><span>Workspace 2</span><span class="on">Workspace 3</span></div></div>
            <div class="cl-group"><header>Window Utilities <span>${ms("expand_more")}</span></header>
              <div class="cl-utils">
                <span>${ms("fullscreen")}Fullscreen</span><span>${ms("fit_screen")}Fake Fullscreen</span><span>${ms("center_focus_strong")}Center Window</span>
                <span>${ms("block")}Inhibit Shortcuts</span><span class="wide" data-shot>${ms("photo_camera")}Screenshot Window</span>
              </div></div>
          </div>
        </div></div>
        <footer class="cl-foot">${ms("desktop_windows")}<span>Desktop</span>→<span>Hi!</span><i class="dots"><b></b><b></b><b></b></i></footer>
      </div></section>

      <section class="v1-drawer" data-d="launch"><div class="v1-in v1-launch" data-launchin>
        <ul data-apps>${APPS.map(([n, d, ic, col]) => `<li data-name="${n.toLowerCase()}"><span class="ico" style="--c:${col}">${ms(ic, "fill")}</span><div><b>${n}</b><small>${d}</small></div></li>`).join("")}</ul>
        <div class="cl-search">${ms("search")}<span data-lq></span><span class="ph" data-lph>Type "&gt;" for commands</span></div>
      </div></section>

      <section class="v1-drawer" data-d="osd"><div class="v1-in v1-osd">
        <div class="v1-slider"><i data-vol style="--v:.4"></i>${ms("volume_up", "fill")}</div>
        <div class="v1-slider"><i style="--v:.7"></i>${ms("brightness_6", "fill")}</div>
      </div></section>`;

    // live clocks
    setInterval(() => {
      const t = clockParts();
      $(stage, "[data-dclock]").textContent = `${t.h}:${t.m}:${t.s} ${t.ap}`;
      ["h", "m", "ap"].forEach((k) => ($(stage, `[data-${k}]`).textContent = t[k]));
      $(stage, "[data-ch]").textContent = t.h;
      $(stage, "[data-cm]").textContent = t.m;
      $(stage, "[data-cap]").textContent = t.ap;
    }, 1000);

    /* ---------------------------------------------------------- engine */
    // page sizes: the Dashboard tab is wider and taller than the Niri tab,
    // so switching tabs visibly morphs the drawer (as in the repo screenshots)
    const PAGES = [
      { w: 792, h: 424 },
      { w: 640, h: 390 }, // measured at runtime, see the tab switch below
    ];
    const CHROME_W = 28; // horizontal padding
    const CHROME_H = 146; // tabs + gaps + footer
    const S = {
      dh: 0, // wrapper height (the animated reveal)
      cw: PAGES[0].w + CHROME_W, // content size (morphs between tabs)
      ch: PAGES[0].h + CHROME_H,
      lh: 0, lch: 0,
      ow: 0, ocw: 70, och: 330,
    };
    const dDrawer = $(stage, '[data-d="dash"]');
    const lDrawer = $(stage, '[data-d="launch"]');
    const oDrawer = $(stage, '[data-d="osd"]');
    const dIn = $(stage, "[data-dashin]");
    const lIn = $(stage, "[data-launchin]");
    const view = $(stage, "[data-view]");
    const sp = Object.fromEntries($$(stage, "[data-sp]").map((p) => [p.dataset.sp, p]));

    const box = (el, x, y, w, h) => {
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width = `${Math.max(0, w)}px`;
      el.style.height = `${Math.max(0, h)}px`;
      el.style.visibility = w > 0.5 && h > 0.5 ? "visible" : "hidden";
    };

    function render() {
      // dashboard: top centre, content anchored to the drawer's bottom edge
      const dx = AX + (AW - S.cw) / 2;
      box(dDrawer, dx, AY, S.cw, S.dh);
      dIn.style.width = `${S.cw}px`;
      dIn.style.height = `${S.ch}px`;
      view.style.width = `${S.cw - CHROME_W}px`;
      view.style.height = `${S.ch - CHROME_H}px`;
      sp.dash.setAttribute("d", drawerPath(S.cw, S.dh, topEdge(dx), false));

      // launcher: bottom centre, content anchored to the top
      const lw = 620;
      const lx = AX + (AW - lw) / 2;
      box(lDrawer, lx, AY + AH - S.lh, lw, S.lh);
      sp.launch.setAttribute("d", drawerPath(lw, S.lh, bottomEdge(lx), true));

      // OSD: right edge, vertically centred, width grows out of the frame
      const oy = AY + (AH - S.och) / 2;
      box(oDrawer, AX + AW - S.ow, oy, S.ow, S.och);
      sp.osd.setAttribute("d", drawerPath(S.och, S.ow, rightEdge(oy), false));
    }
    let visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);
    gsap.ticker.add(() => visible && render());
    render();

    /* ---------------------------------------------------------- script */
    const tabs = $$(stage, "[data-tabs] > span");
    const ind = $(stage, "[data-ind]");
    const row = $(stage, "[data-row]");
    const pills = $$(stage, "[data-pills] span");
    const ws = $(stage, "[data-ws]");
    const items = $$(stage, "[data-apps] li");
    const lq = $(stage, "[data-lq]");
    const lph = $(stage, "[data-lph]");
    const arc = $(stage, "[data-arc]");
    const perf = $$(stage, "[data-pf]");
    const vol = $(stage, "[data-vol]");

    const placeInd = (i, instant) => {
      const t = tabs[i];
      tabs.forEach((x, j) => x.classList.toggle("on", j === i));
      const to = { x: t.offsetLeft + t.offsetWidth * 0.2, width: t.offsetWidth * 0.6 };
      instant ? gsap.set(ind, to) : gsap.to(ind, { ...to, duration: DUR.normal, ease: EASE.standard });
    };
    const launchHeight = () => lIn.scrollHeight;

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      Object.assign(S, { dh: 0, cw: PAGES[0].w + CHROME_W, ch: PAGES[0].h + CHROME_H, lh: 0, ow: 0 });
      gsap.set(row, { x: 0 });
      placeInd(0, true);
      pills.forEach((p, j) => p.classList.toggle("on", j === 2));
      ws.textContent = "3";
      items.forEach((li) => li.classList.remove("hide", "on"));
      items[0].classList.add("on");
      lq.textContent = "";
      lph.style.opacity = 1;
    }, null, 0.001);

    // OSD: width out of the right frame edge (emphasizedDecel 200ms)
    tl.to(S, { ow: () => S.ocw, duration: DUR.small, ease: EASE.emphasizedDecel }, 0.4);
    tl.fromTo(vol, { "--v": 0.4 }, { "--v": 0.82, duration: 0.8, ease: EASE.standard }, 0.7);
    tl.to(S, { ow: 0, duration: DUR.small / 2, ease: EASE.emphasizedAccel }, 2.0);

    // dashboard: height grows out of the top frame (emphasizedDecel 600ms)
    tl.to(S, { dh: () => S.ch, duration: DUR.large, ease: EASE.emphasizedDecel }, 2.4);
    tl.fromTo(arc, { strokeDashoffset: 289 }, { strokeDashoffset: 130, duration: 3.6, ease: "none" }, 2.4);
    perf.forEach((p, i) => tl.to(p, { "--v": [0.14, 0.62, 0.5][i], duration: 1.1, yoyo: true, repeat: 1, ease: "sine.inOut" }, 2.8));

    // → Niri tab: contentX slides (standard 400ms), drawer morphs (emphasized 600ms)
    tl.call(() => placeInd(4), null, 4.8);
    tl.to(row, { x: -(PAGES[0].w + 24), duration: DUR.normal, ease: EASE.standard }, 4.8);
    const niriPage = $(stage, ".cl-niri");
    tl.to(S, {
      cw: PAGES[1].w + CHROME_W,
      ch: () => niriPage.scrollHeight + CHROME_H,
      duration: DUR.large, ease: EASE.emphasized,
      onUpdate: () => (S.dh = S.ch),
    }, 4.8);
    tl.call(() => {
      pills.forEach((p, j) => p.classList.toggle("on", j === 0));
      ws.textContent = "1";
    }, null, 6.0);
    tl.fromTo($(stage, "[data-shot]"), { "--flash": 0 }, { "--flash": 1, duration: 0.15, yoyo: true, repeat: 1 }, 6.8);

    // dashboard back into the frame (emphasizedAccel 400ms)
    tl.to(S, { dh: 0, duration: DUR.normal, ease: EASE.emphasizedAccel }, 7.8);

    // launcher: height grows out of the bottom frame, then shrinks to the filtered list
    tl.to(S, { lh: launchHeight, duration: DUR.normal, ease: EASE.emphasizedDecel }, 8.4);
    tl.set(lph, { opacity: 0 }, 9.0);
    "term".split("").forEach((_, i) => tl.call(() => (lq.textContent = "term".slice(0, i + 1)), null, 9.0 + i * 0.12));
    tl.call(() => {
      items.forEach((li) => {
        const hit = li.dataset.name.includes("term") || li.querySelector("small").textContent.toLowerCase().includes("term");
        li.classList.toggle("hide", !hit);
        li.classList.remove("on");
      });
      items.find((li) => !li.classList.contains("hide"))?.classList.add("on");
      gsap.to(S, { lh: launchHeight(), duration: DUR.large, ease: EASE.emphasized });
    }, null, 9.6);
    tl.to(S, { lh: 0, duration: DUR.small, ease: EASE.emphasizedAccel }, 11.8);
    tl.to({}, { duration: 0.8 });
    return tl;
  },
};
