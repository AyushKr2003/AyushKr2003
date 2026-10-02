import { gsap, $, $$, ms, typeOn } from "./core.js";

/*
  niri-caelestia-shell, rebuilt from the QML: Colours.qml (the default
  M3 palette), AppearanceConfig.qml (Rubik, rounding 12/17/25) and the
  dashboard tabs (Tabs.qml, Dash.qml, NiriThing.qml). The wallpaper ships
  in the repo's images/Wallpapers.
  Loop: dashboard drawer drops out of the top frame, switches to the Niri
  IPC tab, moves a window to another workspace, retracts; then the
  launcher rises and filters as you type.
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

export function calendarHTML() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = first - 1; i >= 0; i--) cells.push(`<span class="dim">${prev - i}</span>`);
  for (let d = 1; d <= days; d++) cells.push(`<span class="${d === now.getDate() ? "today" : ""}">${d}</span>`);
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

export default {
  id: "niri",
  w: 1280,
  h: 640,
  still: 0.2,
  build(stage) {
    const c = clockParts();
    stage.innerHTML = `
      <img class="cl-wall" src="/work/wall-island.webp" alt="" />
      <div class="cl-frame"></div>
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
      <div class="cl-dclock" data-dclock>${c.h}:${c.m}:${c.s} ${c.ap}</div>

      <section class="cl-drawer cl-dash" data-dash>
        <div class="cl-tabs" data-tabs>
          <span class="on">${ms("dashboard", "fill")}Dashboard</span><span>${ms("queue_music")}Media</span><span>${ms("speed")}Performance</span><span>${ms("cloud")}Weather</span><span>${ms("workspaces", "fill")}Niri</span>
          <i class="cl-tabs__ind" data-ind></i>
        </div>
        <div class="cl-pages">
          <div class="cl-page cl-dashgrid" data-p0>
            <div class="cl-card cl-weather">${ms("partly_cloudy_day")}<div><b>10°C</b><small>Partly cloudy</small></div></div>
            <div class="cl-card cl-user"><span class="cl-pfp">${ms("person", "fill")}</span><ul><li>${ms("terminal")}: CachyOS</li><li>${ms("desktop_windows")}: niri</li><li>${ms("speed")}: up 9 hours, 51 minutes</li></ul></div>
            <div class="cl-card cl-media">
              <div class="cl-cover"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="trk"/><circle cx="50" cy="50" r="46" class="prg" data-arc/></svg>${ms("image")}</div>
              <b>The K2 Episode 13 | …</b><small>Unknown album</small><em>Unknown artist</em>
              <div class="cl-ctrl">${ms("skip_previous", "fill")}${ms("play_arrow", "fill")}${ms("skip_next", "fill")}</div>
              <img src="/work/bongocat.gif" alt="" class="cl-bongo" />
            </div>
            <div class="cl-card cl-clock"><b data-ch>${c.h}</b><i>•••</i><b data-cm>${c.m}</b><b class="ap" data-cap>${c.ap}</b></div>
            <div class="cl-card cl-cal">${calendarHTML()}</div>
            <div class="cl-card cl-perf"><div><i style="--v:.06" data-pf></i>${ms("memory")}</div><div><i style="--v:.42" data-pf></i>${ms("developer_board")}</div><div><i style="--v:.36" class="t" data-pf></i>${ms("storage")}</div></div>
          </div>
          <div class="cl-page cl-niri" data-p1>
            <div class="cl-group"><header>Move Window to Workspace <span>${ms("expand_more")}</span></header>
              <div class="cl-pills" data-pills><span>Workspace 1</span><span>Workspace 2</span><span class="on">Workspace 3</span></div></div>
            <div class="cl-group"><header>Window Utilities <span>${ms("expand_more")}</span></header>
              <div class="cl-utils">
                <span>${ms("fullscreen")}Fullscreen</span><span>${ms("fit_screen")}Fake Fullscreen</span><span>${ms("center_focus_strong")}Center Window</span>
                <span>${ms("block")}Inhibit Shortcuts</span><span class="wide" data-shot>${ms("photo_camera")}Screenshot Window</span>
              </div></div>
          </div>
        </div>
        <footer class="cl-foot">${ms("desktop_windows")}<span>Desktop</span>→<span>Hi!</span><i class="dots"><b></b><b></b><b></b></i></footer>
      </section>

      <section class="cl-drawer cl-launch" data-launch>
        <ul data-apps>${APPS.map(([n, d, ic, col]) => `<li data-name="${n.toLowerCase()}"><span class="ico" style="--c:${col}">${ms(ic, "fill")}</span><div><b>${n}</b><small>${d}</small></div></li>`).join("")}</ul>
        <div class="cl-search">${ms("search")}<span data-lq></span><span class="ph" data-lph>Type "&gt;" for commands</span></div>
      </section>`;

    // live clocks
    const set = () => {
      const t = clockParts();
      $(stage, "[data-dclock]").textContent = `${t.h}:${t.m}:${t.s} ${t.ap}`;
      ["h", "m", "ap"].forEach((k) => ($(stage, `[data-${k}]`).textContent = t[k]));
      $(stage, "[data-ch]").textContent = t.h;
      $(stage, "[data-cm]").textContent = t.m;
      $(stage, "[data-cap]").textContent = t.ap;
    };
    setInterval(set, 1000);

    const dash = $(stage, "[data-dash]");
    const launch = $(stage, "[data-launch]");
    const tabs = $$(stage, "[data-tabs] > span");
    const ind = $(stage, "[data-ind]");
    const p0 = $(stage, "[data-p0]");
    const p1 = $(stage, "[data-p1]");
    const pills = $$(stage, "[data-pills] span");
    const ws = $(stage, "[data-ws]");
    const items = $$(stage, "[data-apps] li");
    const lq = $(stage, "[data-lq]");
    const lph = $(stage, "[data-lph]");
    const arc = $(stage, "[data-arc]");
    const perf = $$(stage, "[data-pf]");

    const placeInd = (i) => {
      const t = tabs[i];
      gsap.to(ind, { x: t.offsetLeft + t.offsetWidth * 0.2, width: t.offsetWidth * 0.6, duration: 0.45, ease: "expo.out" });
      tabs.forEach((x, j) => x.classList.toggle("on", j === i));
    };

    // Caelestia's emphasized curves
    const emph = "expo.out";
    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      placeInd(0);
      pills.forEach((p, j) => p.classList.toggle("on", j === 2));
      ws.textContent = "3";
      items.forEach((li) => li.classList.remove("hide", "on"));
      items[0].classList.add("on");
      lq.textContent = "";
      lph.style.opacity = 1;
    }, null, 0.001);
    tl.set(dash, { yPercent: -102 }, 0).set(launch, { yPercent: 104 }, 0);
    tl.set(p0, { autoAlpha: 1, x: 0 }, 0).set(p1, { autoAlpha: 0, x: 40 }, 0);

    // dashboard drawer out of the top frame
    tl.to(dash, { yPercent: 0, duration: 0.6, ease: emph }, 0.6);
    tl.fromTo(arc, { strokeDashoffset: 289 }, { strokeDashoffset: 120, duration: 4, ease: "none" }, 0.6);
    perf.forEach((p, i) => tl.to(p, { "--v": [0.12, 0.66, 0.48][i], duration: 1.2, yoyo: true, repeat: 2, ease: "sine.inOut" }, 0.8));

    // → Niri tab
    tl.call(() => placeInd(4), null, 3.4);
    tl.to(p0, { autoAlpha: 0, x: -40, duration: 0.35, ease: "power2.in" }, 3.4);
    tl.to(p1, { autoAlpha: 1, x: 0, duration: 0.5, ease: emph }, 3.6);
    tl.call(() => {
      pills.forEach((p, j) => p.classList.toggle("on", j === 0));
      ws.textContent = "1";
    }, null, 4.8);
    tl.fromTo($(stage, "[data-shot]"), { "--flash": 0 }, { "--flash": 1, duration: 0.15, yoyo: true, repeat: 1 }, 5.8);

    // drawer back into the frame
    tl.to(dash, { yPercent: -102, duration: 0.5, ease: "power3.in" }, 7.2);

    // launcher rises from the bottom frame and filters
    tl.to(launch, { yPercent: 0, duration: 0.6, ease: emph }, 7.9);
    tl.set(lph, { opacity: 0 }, 8.7);
    const query = "term";
    const done = typeOn(tl, lq, query, 8.7, 0.6);
    tl.call(() => {
      items.forEach((li) => {
        const hit = li.dataset.name.includes("term") || li.querySelector("small").textContent.toLowerCase().includes("term");
        li.classList.toggle("hide", !hit);
        li.classList.remove("on");
      });
      items.find((li) => !li.classList.contains("hide"))?.classList.add("on");
    }, null, done);
    tl.to(launch, { yPercent: 104, duration: 0.5, ease: "power3.in" }, done + 2.2);
    tl.to({}, { duration: 1 });
    return tl;
  },
};
