import { gsap, $, $$, centre } from "./core.js";

/*
  Musixir, rebuilt from musixir-flutter/lib as one phone screen: 360×780 dp.
  Palette from app_pallet.dart (#121212, card #1E1E1E, subtitle #A7A7A7).
  Pages and routes are the app's own:
  - home_page.dart: body swaps between songs_page and library_page under a
    shared music_slab + bottom nav (no route, so no transition)
  - library_page.dart: favourites as 35-radius CircleAvatars, a topLeft
    gradient from the current song's colour, and "Upload a New Song." last
  - song_upload_page.dart: pushed with MaterialPageRoute (Android zoom)
  - music_slab.dart: AnimatedContainer(500ms) in the song's hexColor; a tap
    pushes music_player.dart with a SlideTransition from Offset(0, 1),
    Curves.easeIn
  Taps are drawn like Android's "Show taps" developer option.

  Each upload carries a colour, and that colour themes the whole player.
  The stage reports it as a "tint" event so the device around the screen
  can light the room in the same colour.
*/
const SONGS = [
  { name: "SongUpload", artist: "Abhay", color: "#5b3a8e", hue: 266 },
  { name: "song sample 4", artist: "ayush", color: "#2e9fb0", hue: 188 },
  { name: "SongTest", artist: "Artist123", color: "#9a3b58", hue: 342 },
];
const ART = "/work/musixir-art.webp";
const ic = (n, cls = "") => `<img class="mx-ic ${cls}" src="/work/mx-${n}.png" alt="" />`;

export default {
  id: "musixir",
  w: 360,
  h: 780,
  still: 0.55,
  build(stage) {
    stage.innerHTML = `
      <div class="mx-status"><span data-clock>7:36</span><span class="mx-sig">▾◢▮</span></div>

      <div class="mx-screen mx-home" data-home>
        <div class="mx-grad" data-grad></div>
        <div class="mx-recent">
          ${SONGS.map((s) => `<div class="mx-rc"><img src="${ART}" alt="" /><b>${s.name}</b></div>`).join("")}
        </div>
        <h3>Latest Today</h3>
        <div class="mx-latest">
          ${SONGS.map((s, i) => `<div class="mx-tile" data-tile="${i}"><img src="${ART}" alt="" /><b>${s.name}</b><small>${s.artist}</small></div>`).join("")}
        </div>
      </div>

      <div class="mx-screen mx-lib" data-lib>
        <ul>
          ${SONGS.slice(1).map((s) => `<li><img src="${ART}" alt="" /><div><b>${s.name}</b><small>${s.artist}</small></div></li>`).join("")}
          <li data-add><span class="mx-plus">+</span><div><b>Upload a New Song.</b></div></li>
        </ul>
      </div>

      <div class="mx-slab" data-slab>
        <img src="${ART}" alt="" />
        <div><b data-sn></b><small data-sa></small></div>
        <span class="mx-heart">♡</span><span class="mx-pp">❚❚</span>
        <i class="mx-prog"><i data-prog></i></i>
      </div>
      <nav class="mx-nav">
        <span data-nav="home">${ic("home_filled", "on")}${ic("home_unfilled", "off")}Home</span>
        <span>${ic("search_unfilled")}Search</span>
        <span data-nav="lib">${ic("library")}Library</span>
      </nav>

      <div class="mx-screen mx-upload" data-up>
        <header class="mx-bar"><span>←</span><b>Upload Song</b><span data-done>✓</span></header>
        <div class="mx-dotted" data-thumb-pick><img src="${ART}" alt="" data-up-art /><div data-up-empty><span class="mx-folder"></span><small>Select the thumbnail for your song.</small></div></div>
        <div class="mx-in">Pick Song</div>
        <div class="mx-in" data-up-name></div>
        <div class="mx-in" data-up-artist></div>
        <div class="mx-seg"><span>Primary</span><span>Accent</span><span class="on">Wheel</span></div>
        <div class="mx-wheel">
          <div class="mx-ring"></div>
          <div class="mx-sq" data-sq><i></i></div>
          <b class="mx-hue" data-hue></b>
        </div>
        <div class="mx-swatches">${SONGS.slice(1).map((x) => `<i style="background:${x.color}"></i>`).join("")}<i data-swatch class="sel"></i></div>
      </div>

      <div class="mx-screen mx-player" data-player>
        ${ic("pull-down-arrow", "mx-down")}
        <div class="mx-art"><img src="${ART}" alt="" /></div>
        <div class="mx-meta"><div><b data-pn></b><span data-pa></span></div><span class="mx-heart big">♥</span></div>
        <div class="mx-seek"><i data-seek></i><b data-thumb></b></div>
        <div class="mx-times"><span data-cur>0:00</span><span>1:05</span></div>
        <div class="mx-ctrl">${ic("shuffle")}${ic("previus-song")}<span class="mx-big">❚❚</span>${ic("next-song")}${ic("repeat")}</div>
        <div class="mx-foot">${ic("connect-device")}${ic("playlist")}</div>
      </div>

      <i class="mx-touch" data-touch></i>`;

    const home = $(stage, "[data-home]");
    const lib = $(stage, "[data-lib]");
    const up = $(stage, "[data-up]");
    const player = $(stage, "[data-player]");
    const slab = $(stage, "[data-slab]");
    const grad = $(stage, "[data-grad]");
    const prog = $(stage, "[data-prog]");
    const seek = $(stage, "[data-seek]");
    const thumb = $(stage, "[data-thumb]");
    const cur = $(stage, "[data-cur]");
    const tiles = $$(stage, "[data-tile]");
    const touch = $(stage, "[data-touch]");
    const navHome = $(stage, '[data-nav="home"]');
    const navLib = $(stage, '[data-nav="lib"]');
    const upArt = $(stage, "[data-up-art]");
    const upEmpty = $(stage, "[data-up-empty]");
    const upName = $(stage, "[data-up-name]");
    const upArtist = $(stage, "[data-up-artist]");
    const text = (sel, v) => $$(stage, sel).forEach((e) => (e.textContent = v));
    const tint = (color) => stage.dispatchEvent(new CustomEvent("tint", { detail: color, bubbles: true }));

    // "Show taps": a ring flashes where the finger lands, the target dips
    function tap(tl, el, at) {
      tl.call(() => {
        const c = centre(stage, el);
        gsap.set(touch, { x: c.x, y: c.y });
      }, null, at);
      tl.fromTo(touch, { autoAlpha: 0.85, scale: 0.55 }, { autoAlpha: 0, scale: 1.25, duration: 0.45, ease: "power2.out" }, at);
      tl.fromTo(el, { scale: 1 }, { scale: 0.97, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut" }, at);
      return at + 0.3;
    }
    function tab(tl, which, at) {
      tl.call(() => {
        navHome.classList.toggle("on", which === "home");
        navLib.classList.toggle("on", which === "lib");
        home.style.visibility = which === "home" ? "visible" : "hidden";
        lib.style.visibility = which === "lib" ? "visible" : "hidden";
      }, null, at);
    }
    function current(tl, i, at) {
      const s = SONGS[i];
      tl.call(() => {
        text("[data-sn]", s.name);
        text("[data-pn]", s.name);
        text("[data-sa]", s.artist);
        text("[data-pa]", s.artist);
        tint(s.color);
      }, null, at);
      // AnimatedContainer(duration: 500ms); the page gradients follow the song
      tl.to(slab, { backgroundColor: s.color, duration: 0.5, ease: "power1.inOut" }, at);
      tl.to([grad, lib, player], { "--c": s.color, duration: 0.5 }, at);
    }
    function progress(tl, at, dur) {
      const p = { v: 0 };
      tl.fromTo(p, { v: 0 }, {
        v: 1,
        duration: dur,
        ease: "none",
        onUpdate: () => {
          prog.style.width = `${p.v * 100}%`;
          seek.style.width = `${p.v * 100}%`;
          thumb.style.left = `${p.v * 100}%`;
          const secs = Math.round(p.v * 65);
          cur.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
        },
      }, at);
    }

    const tl = gsap.timeline({ repeat: -1 });
    tl.set(up, { autoAlpha: 0, scale: 0.86 }, 0).set(player, { yPercent: 100 }, 0);
    tl.set(touch, { autoAlpha: 0 }, 0);
    tl.call(() => {
      upArt.style.opacity = 0;
      upEmpty.style.opacity = 1;
      upName.innerHTML = "<em>Song Name</em>";
      upArtist.innerHTML = "<em>Artist</em>";
    }, null, 0);
    tab(tl, "home", 0.001);
    current(tl, 2, 0.001);
    progress(tl, 0.001, 1.6);

    // Library → "Upload a New Song." (MaterialPageRoute: Android zoom in)
    let t = tap(tl, navLib, 0.9);
    tab(tl, "lib", t);
    t = tap(tl, $(stage, "[data-add]"), t + 0.6);
    tl.to(up, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" }, t);

    // thumbnail, name and artist, then the colour on the flex_color_picker wheel
    t = tap(tl, $(stage, "[data-thumb-pick]"), t + 0.6);
    tl.call(() => ((upArt.style.opacity = 1), (upEmpty.style.opacity = 0)), null, t);
    const s = SONGS[0];
    const n = { k: 0 };
    tl.to(n, {
      k: 1,
      duration: 1,
      ease: "none",
      onUpdate: () => {
        upName.textContent = s.name.slice(0, Math.round(Math.min(1, n.k * 2) * s.name.length));
        upArtist.textContent = s.artist.slice(0, Math.round(Math.max(0, n.k * 2 - 1) * s.artist.length));
      },
    }, t + 0.3);
    t += 1.5;
    tl.fromTo($(stage, "[data-hue]"), { rotation: 342 - 90 }, { rotation: s.hue - 90, duration: 0.9, ease: "power2.inOut" }, t);
    tl.fromTo($(stage, "[data-sq]"), { "--h": 342 }, { "--h": s.hue, duration: 0.9, ease: "power2.inOut" }, t);
    tl.fromTo($(stage, "[data-swatch]"), { backgroundColor: "#9a3b58" }, { backgroundColor: s.color, duration: 0.9 }, t);

    // ✓ uploads and pops back; Home; the new song is first in Latest Today
    t = tap(tl, $(stage, "[data-done]"), t + 1.2);
    tl.to(up, { autoAlpha: 0, scale: 0.9, duration: 0.25, ease: "power2.in" }, t);
    t = tap(tl, navHome, t + 0.5);
    tab(tl, "home", t);
    t = tap(tl, tiles[0], t + 0.6);
    current(tl, 0, t);
    progress(tl, t, 4.6);

    // slab → player: SlideTransition from Offset(0, 1), Curves.easeIn, 300ms
    t = tap(tl, slab, t + 0.9);
    tl.to(player, { yPercent: 0, duration: 0.3, ease: "power1.in" }, t);
    t = tap(tl, $(stage, ".mx-down"), t + 3.1);
    tl.to(player, { yPercent: 100, duration: 0.3, ease: "power1.in" }, t);

    // next song: the slab and the gradient change colour in place
    t = tap(tl, tiles[1], t + 0.6);
    current(tl, 1, t);
    progress(tl, t, 2.6);
    tl.to({}, { duration: 2.8 }, t);
    return tl;
  },
};
