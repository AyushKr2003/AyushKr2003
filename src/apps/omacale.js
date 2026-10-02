import { gsap, $, $$, ms, typeOn } from "./core.js";
import { CAELESTIA_LOGO, calendarHTML, clockParts } from "./niri.js";

/*
  Omacale, after preview.webp and the README: Caelestia's screen frame,
  with every panel a drawer that slides out of it. The OSD comes from the
  right edge, the dashboard from the top, the notifications sidebar from
  the right and the launcher from the bottom. Colours are Material 3,
  generated from the Omarchy theme. Here that's a warm amber scheme to
  match the repo's eye wallpaper.
*/
const APPS = [
  ["Aether", "Desktop theming application", "#c48bff"],
  ["Alacritty", "A fast, cross-platform, OpenGL terminal emulator", "#e8562a"],
  ["Basecamp", "Basecamp", "#3bb273"],
  ["Chromium", "Access the Internet", "#4c8bf5"],
  ["cliamp", "A retro terminal music player inspired by Winamp 2.x", "#62c46a"],
  ["Neovim", "Edit text files", "#57a143"],
];

export default {
  id: "omacale",
  w: 1300,
  h: 650,
  still: 0.45,
  build(stage) {
    const c = clockParts();
    stage.innerHTML = `
      <img class="cl-wall" src="/work/wall-eyes.webp" alt="" />
      <div class="cl-frame om-frame"></div>
      <nav class="cl-bar om-bar">
        ${CAELESTIA_LOGO}
        <div class="om-ws"><i></i><i></i><b></b><i></i><i></i></div>
        <div class="om-title">${ms("desktop_windows")}<span>Desktop</span></div>
        <div class="cl-bar__low">
          ${ms("calendar_month")}
          <div class="cl-vclock om-vclock"><span data-h>${c.h}</span><span data-m>${c.m}</span><span data-ap>${c.ap.toLowerCase()}</span></div>
          <div class="cl-status">${ms("coffee", "fill")}${ms("volume_up", "fill")}${ms("wifi", "fill")}${ms("bluetooth")}${ms("headphones", "fill")}</div>
          ${ms("power_settings_new", "cl-power")}
        </div>
      </nav>
      <div class="om-bigclock" data-big>${c.h}</div>

      <section class="cl-drawer cl-dash om-dash" data-dash>
        <div class="cl-tabs" data-tabs>
          <span class="on">${ms("dashboard", "fill")}Dashboard</span><span>${ms("queue_music")}Media</span><span>${ms("speed")}Performance</span><span>${ms("cloud")}Weather</span>
          <i class="cl-tabs__ind" data-ind></i>
        </div>
        <div class="cl-dashgrid om-grid">
          <div class="cl-card cl-weather">${ms("dark_mode")}<div><b>26°C</b><small>Clear</small></div></div>
          <div class="cl-card om-user"><span class="om-pfp">${ms("person", "fill")}</span><div><span class="chip">${ms("desktop_windows")} Hyprland…</span><span class="up">${ms("refresh")} up 2 hours, 30 minut…</span></div></div>
          <div class="cl-card cl-media om-media">
            <div class="cl-cover om-cover"><svg viewBox="0 0 100 100"><path class="wave" data-wave d=""/></svg>${ms("image")}</div>
            <b>Suits - s3 e11 Wa…</b><small>Unknown album</small><em>Unknown artist</em>
            <div class="om-ctrl"><span>${ms("skip_previous", "fill")}</span><span class="pp">${ms("pause", "fill")}</span><span>${ms("skip_next", "fill")}</span></div>
            <img src="/work/bongocat.gif" alt="" class="cl-bongo" />
          </div>
          <div class="cl-card cl-clock om-clock"><b data-ch>${c.h}</b><i>•••</i><b data-cm>${c.m}</b><i>•••</i><b data-cs>${c.s}</b><b class="ap" data-cap>${c.ap}</b></div>
          <div class="cl-card cl-cal om-cal">${calendarHTML()}</div>
          <div class="cl-card om-perf">${["memory", "developer_board", "storage"].map((n, i) => `<div class="ring" style="--v:${[0.35, 0.6, 0.45][i]}" data-ring>${ms(n)}</div>`).join("")}</div>
        </div>
      </section>

      <div class="om-osd" data-osd>
        <div class="om-slider" data-vol>${ms("volume_up", "fill")}<i data-volv></i></div>
        <div class="om-slider">${ms("bedtime", "fill")}<i style="--v:.45"></i></div>
      </div>
      <div class="om-session" data-session>${["logout", "power_settings_new", "download", "refresh"].map((n) => `<span>${ms(n)}</span>`).join("")}</div>

      <aside class="om-side" data-side>
        <div class="om-notifs"><h4>Notifications</h4><img src="/work/dino.webp" alt="" /><p>All up to date!</p></div>
        <div class="om-tile"><span class="om-tico">${ms("coffee", "fill")}</span><div><b>Keep awake</b><small>Preventing sleep mode</small></div><span class="om-switch on" data-switch><i>${ms("check")}</i></span><em class="since">Active since 11:07 PM</em></div>
        <div class="om-tile"><span class="om-tico">${ms("screen_record")}</span><div><b>Screen recor…</b><small>Ready</small></div><span class="om-chipbtn">${ms("fullscreen")} Fullscreen</span></div>
        <div class="om-qt"><h5>Quick toggles</h5><div>${["wifi", "bluetooth", "mic", "settings", "do_not_disturb_on", "notifications"].map((n, i) => `<span class="${i < 2 ? "on" : ""}">${ms(n, i < 2 ? "fill" : "")}</span>`).join("")}</div></div>
      </aside>

      <section class="cl-drawer cl-launch om-launch" data-launch>
        <ul>${APPS.map(([n, d, col], i) => `<li class="${i === 0 ? "on" : ""}"><span class="ico letter" style="--c:${col}">${n[0]}</span><div><b>${n}</b><small>${d}</small></div></li>`).join("")}</ul>
        <div class="cl-search">${ms("search")}<span data-lq></span><span class="ph" data-lph>Type "&gt;" for commands, ":" for the Omarchy menu</span></div>
      </section>`;

    // wavy progress ring around the cover (M3 expressive)
    const wave = $(stage, "[data-wave]");
    const drawWave = (t) => {
      let d = "";
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2 * 0.72 - Math.PI / 2;
        const r = 44 + Math.sin(i * 0.9 + t * 4) * 2.2;
        d += `${i ? "L" : "M"}${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
      }
      wave.setAttribute("d", d);
    };
    drawWave(0);

    setInterval(() => {
      const t = clockParts();
      $(stage, "[data-h]").textContent = t.h;
      $(stage, "[data-m]").textContent = t.m;
      $(stage, "[data-ap]").textContent = t.ap.toLowerCase();
      $(stage, "[data-ch]").textContent = t.h;
      $(stage, "[data-cm]").textContent = t.m;
      $(stage, "[data-cs]").textContent = t.s;
      $(stage, "[data-big]").textContent = t.h;
    }, 1000);

    const dash = $(stage, "[data-dash]");
    const osd = $(stage, "[data-osd]");
    const session = $(stage, "[data-session]");
    const side = $(stage, "[data-side]");
    const launch = $(stage, "[data-launch]");
    const volv = $(stage, "[data-volv]");
    const lq = $(stage, "[data-lq]");
    const lph = $(stage, "[data-lph]");
    const sw = $(stage, "[data-switch]");
    const ind = $(stage, "[data-ind]");
    const tab0 = $(stage, "[data-tabs] > span");

    const out = "expo.out";
    const back = "power3.in";
    const tl = gsap.timeline({ repeat: -1, onUpdate: () => drawWave(tl.time()) });
    tl.call(() => {
      gsap.set(ind, { x: tab0.offsetLeft + tab0.offsetWidth * 0.2, width: tab0.offsetWidth * 0.6 });
      lq.textContent = "";
      lph.style.opacity = 1;
      sw.classList.add("on");
    }, null, 0.001);
    tl.set(dash, { yPercent: -103 }, 0).set(launch, { yPercent: 104 }, 0);
    tl.set([osd, session], { xPercent: 130 }, 0).set(side, { xPercent: 104 }, 0);
    tl.set(volv, { "--v": 0.35 }, 0);

    // 1. volume change: OSD slides out of the right edge
    tl.to(osd, { xPercent: 0, duration: 0.55, ease: out }, 0.5);
    tl.to(volv, { "--v": 0.8, duration: 1, ease: "power2.inOut" }, 0.9);
    // 2. dashboard drops from the top, session column joins the OSD
    tl.to(dash, { yPercent: 0, duration: 0.6, ease: out }, 1.6);
    tl.to(session, { xPercent: 0, duration: 0.55, ease: out }, 1.9);
    // 3. sidebar from the right
    tl.to(side, { xPercent: 0, duration: 0.6, ease: out }, 2.6);
    tl.call(() => sw.classList.toggle("on"), null, 4.2);
    tl.call(() => sw.classList.toggle("on"), null, 5.0);
    // 4. dashboard folds away and the launcher rises from the bottom
    tl.to(dash, { yPercent: -103, duration: 0.45, ease: back }, 5.4);
    tl.to(launch, { yPercent: 0, duration: 0.6, ease: out }, 5.7);
    tl.set(lph, { opacity: 0 }, 6.5);
    typeOn(tl, lq, ">theme", 6.5, 0.7);
    // everything folds back into the frame
    tl.to(launch, { yPercent: 104, duration: 0.45, ease: back }, 9.2);
    tl.to(side, { xPercent: 104, duration: 0.45, ease: back }, 9.35);
    tl.to([osd, session], { xPercent: 130, duration: 0.45, ease: back }, 9.5);
    tl.to({}, { duration: 1.4 });
    return tl;
  },
};
