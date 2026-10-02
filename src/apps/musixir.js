import { gsap, $, $$, pointerTo, cursorHTML } from "./core.js";

/*
  Musixir, rebuilt from musixir-flutter/lib: app_pallet.dart (#121212,
  card #1E1E1E, subtitle #A7A7A7), songs_page.dart (recently played grid,
  "Latest Today", gradient from the song colour), music_slab.dart (66px
  slab in the song's hexColor, 2px progress) and music_player.dart
  (gradient hexColor → #121212). Icons are the app's own PNGs. Songs and
  colours match the repo screenshots.
  Each upload carries a colour, and that colour themes the whole player.
  The third phone is song_upload_page.dart: the colour picked on its
  flex_color_picker wheel becomes the theme of the next song.
*/
const SONGS = [
  { name: "SongUpload", artist: "Abhay", color: "#5b3a8e", hue: 266 },
  { name: "song sample 4", artist: "ayush", color: "#2e9fb0", hue: 188 },
  { name: "SongTest", artist: "Artist123", color: "#9a3b58", hue: 342 },
];
const ART = "/work/musixir-art.webp";
const ic = (n) => `<img class="mx-ic" src="/work/mx-${n}.png" alt="" />`;
const status = (t) => `<div class="mx-status"><span>${t}</span><i class="mx-cam"></i><span class="mx-sig">▾◢▮</span></div>`;

export default {
  id: "musixir",
  w: 1320,
  h: 820,
  still: 0.3,
  build(stage) {
    stage.innerHTML = `
      <div class="mx-phone" data-a>
        <div class="mx-screen">
          ${status("7:36")}
          <div class="mx-grad" data-grad></div>
          <div class="mx-recent">
            ${SONGS.map((s) => `<div class="mx-rc"><img src="${ART}" alt="" /><b>${s.name}</b></div>`).join("")}
          </div>
          <h3>Latest Today</h3>
          <div class="mx-latest">
            ${SONGS.map((s, i) => `<div class="mx-tile" data-tile="${i}"><img src="${ART}" alt="" /><b>${s.name}</b><small>${s.artist}</small></div>`).join("")}
          </div>
          <div class="mx-slab" data-slab>
            <img src="${ART}" alt="" />
            <div><b data-sn>${SONGS[0].name}</b><small data-sa>${SONGS[0].artist}</small></div>
            <span class="mx-heart">♡</span><span class="mx-pp">❚❚</span>
            <i class="mx-prog"><i data-prog></i></i>
          </div>
          <nav class="mx-nav"><span class="on">${ic("home_filled")}Home</span><span>${ic("search_unfilled")}Search</span><span>${ic("library")}Library</span></nav>
        </div>
      </div>

      <div class="mx-phone" data-b>
        <div class="mx-screen mx-player" data-player>
          ${status("7:39")}
          ${ic("pull-down-arrow").replace("mx-ic", "mx-ic mx-down")}
          <div class="mx-art"><img src="${ART}" alt="" /></div>
          <div class="mx-meta"><div><b data-pn>${SONGS[0].name}</b><span data-pa>${SONGS[0].artist}</span></div><span class="mx-heart big">♥</span></div>
          <div class="mx-seek"><i data-seek></i><b data-thumb></b></div>
          <div class="mx-times"><span data-cur>0:00</span><span>1:05</span></div>
          <div class="mx-ctrl">${ic("shuffle")}${ic("previus-song")}<span class="mx-big" data-pause>❚❚</span>${ic("next-song")}${ic("repeat")}</div>
          <div class="mx-foot">${ic("connect-device")}${ic("playlist")}</div>
        </div>
      </div>
      <div class="mx-phone" data-c>
        <div class="mx-screen mx-upload">
          ${status("7:39")}
          <header class="mx-bar"><span>←</span><b>Upload Song</b><span>✓</span></header>
          <div class="mx-dotted" data-thumb-pick><img src="${ART}" alt="" data-up-art /><div data-up-empty><span class="mx-folder"></span><small>Select the thumbnail for your song.</small></div></div>
          <div class="mx-in">Pick Song</div>
          <div class="mx-in" data-up-name><em>Song Name</em></div>
          <div class="mx-in" data-up-artist><em>Artist</em></div>
          <div class="mx-seg"><span>Primary</span><span>Accent</span><span class="on">Wheel</span></div>
          <div class="mx-wheel" data-wheel>
            <div class="mx-ring"></div>
            <div class="mx-sq" data-sq><i data-sqdot></i></div>
            <b class="mx-hue" data-hue></b>
          </div>
          <div class="mx-swatches">${SONGS.map((x) => `<i style="background:${x.color}"></i>`).join("")}<i data-cur-swatch class="sel"></i></div>
        </div>
      </div>
      ${cursorHTML}`;

    const grad = $(stage, "[data-grad]");
    const slab = $(stage, "[data-slab]");
    const player = $(stage, "[data-player]");
    const prog = $(stage, "[data-prog]");
    const seek = $(stage, "[data-seek]");
    const thumb = $(stage, "[data-thumb]");
    const cur = $(stage, "[data-cur]");
    const tiles = $$(stage, "[data-tile]");
    const cursor = $(stage, ".app-cursor");
    const text = (sel, v) => $$(stage, sel).forEach((e) => (e.textContent = v));

    const upArt = $(stage, "[data-up-art]");
    const upEmpty = $(stage, "[data-up-empty]");
    const upName = $(stage, "[data-up-name]");
    const upArtist = $(stage, "[data-up-artist]");
    const hueDot = $(stage, "[data-hue]");
    const sq = $(stage, "[data-sq]");
    const swatch = $(stage, "[data-cur-swatch]");

    // upload screen: thumbnail, name, artist, then the colour on the wheel
    function prepare(tl, i, at) {
      const s = SONGS[i];
      tl.call(() => {
        upArt.style.opacity = 0;
        upEmpty.style.opacity = 1;
        upName.innerHTML = "<em>Song Name</em>";
        upArtist.innerHTML = "<em>Artist</em>";
      }, null, at);
      tl.call(() => {
        upArt.style.opacity = 1;
        upEmpty.style.opacity = 0;
      }, null, at + 0.3);
      const n = { k: 0 };
      tl.to(n, {
        k: 1,
        duration: 0.7,
        ease: "none",
        onUpdate: () => {
          upName.textContent = s.name.slice(0, Math.round(n.k * s.name.length));
          upArtist.textContent = s.artist.slice(0, Math.round(Math.max(0, n.k * 2 - 1) * s.artist.length));
        },
      }, at + 0.5);
      tl.to(hueDot, { rotation: s.hue - 90, duration: 0.8, ease: "power2.inOut" }, at + 1.1);
      tl.to(sq, { "--h": s.hue, duration: 0.8, ease: "power2.inOut" }, at + 1.1);
      tl.to(swatch, { backgroundColor: s.color, duration: 0.8 }, at + 1.1);
    }

    function play(tl, i, at) {
      const s = SONGS[i];
      tl.call(() => {
        text("[data-sn]", s.name);
        text("[data-pn]", s.name);
        text("[data-sa]", s.artist);
        text("[data-pa]", s.artist);
      }, null, at);
      // AnimatedContainer(duration: 500ms) on the slab, the gradients follow
      tl.to(slab, { backgroundColor: s.color, duration: 0.5, ease: "power1.inOut" }, at);
      tl.to(grad, { "--c": s.color, duration: 0.5 }, at);
      tl.to(player, { "--c": s.color, duration: 0.5 }, at);
      const p = { v: 0 };
      tl.fromTo(
        p,
        { v: 0 },
        {
          v: 1,
          duration: 3.2,
          ease: "none",
          onUpdate: () => {
            prog.style.width = `${p.v * 100}%`;
            seek.style.width = `${p.v * 100}%`;
            thumb.style.left = `${p.v * 100}%`;
            const secs = Math.round(p.v * 65);
            cur.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
          },
        },
        at
      );
    }

    gsap.set(cursor, { x: 300, y: 700 });
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(cursor, { autoAlpha: 1 }, 0);
    let t = 0.3;
    [1, 2, 0].forEach((i) => {
      prepare(tl, i, t);
      t = pointerTo(tl, stage, cursor, tiles[i], t + 1.9, { dur: 0.6 });
      play(tl, i, t);
      t += 3.2;
    });
    return tl;
  },
};
