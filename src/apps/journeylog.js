import { gsap, $, $$, typeOn, pointerTo, cursorHTML } from "./core.js";

/*
  JourneyLog ("Wonderful Journey"), rebuilt from the running app: Laravel 7
  Blade views on Bootstrap 4 (navbar-dark bg-dark, .card grid with the
  category footer). Seeded stories are the repo's own ArticleSeeder data.
  Loop: a member writes a new story in "New Blog", presses Create, and
  it lands at the top of the home grid.
*/
const SEEDED = [
  ["Mount Kelud Today", "Today, Mount kelud is very phenomenal with its new dome that exists from its lake. To reach Mo...", "Mountain"],
  ["Karampuang Island Tourism in Mamuju", "Karampuang Island is a beautiful island located in Karampuang Village, Mamuju District, Mamuju...", "Beach"],
  ["Larat Island, The Island Of The Light", "Larat Island is the outer island of Indonesia that located in the Aru Sea and it is bordered b...", "Archipelago"],
  ["Bungus Beach, Padang - West Sumatra", "Bungus Beach is located in a quiet Bungus bay. The atmosphere around the beach is beautiful an...", "Beach"],
  ["Tanjung Lesung - Pandeglang, Banten", "Banten is one area that has many beaches as tourism potential. We all know about Anyer, Carita...", "Beach"],
];
const NEW = ["Raja Ampat Regency", "Raja Ampat is a regency in West Papua and also become the one of wonderful destinations in Ind...", "Archipelago"];
const card = ([t, b, c], extra = "") =>
  `<div class="jl-card ${extra}"><div class="jl-h">${t}</div><div class="jl-b">${b} <a>full story</a></div><div class="jl-f"><em>Category: <a>${c}</a></em></div></div>`;

const NAV = `
  <nav class="jl-nav"><b>Wonderful Journey</b><a>Home</a><a>Dashboard</a><a>Profile</a><a>Blog</a>
    <span class="r"><a>⊕ Create Blog</a><a>⇥ Logout</a></span></nav>`;

export default {
  id: "journeylog",
  w: 1180,
  h: 660,
  still: 0.9,
  build(stage) {
    stage.innerHTML = `
      <div class="jl-chrome"><i></i><i></i><i></i><span>localhost:8000/article/create</span></div>
      <div class="jl-view" data-form>
        ${NAV}
        <h3 class="jl-title">New Blog</h3>
        <form class="jl-form" onsubmit="return false">
          <label>Title</label><div class="fc" data-title></div>
          <label>Category</label><div class="fc sel"><span data-cat>Beach</span><i>⌄</i></div>
          <label>Photo</label><div class="file"><span class="btn-file">Choose File</span><span data-file>No file chosen</span></div>
          <label>Description</label><div class="fc area" data-desc></div>
          <span></span><button class="jl-btn" data-create>Create</button>
        </form>
        <p class="jl-copy">Copyright © 2021 by Wonderful Journey</p>
      </div>
      <div class="jl-view" data-home>
        ${NAV}
        <div class="jl-grid" data-grid>
          ${card(NEW, "is-new")}
          ${SEEDED.map((s) => card(s)).join("")}
        </div>
      </div>
      ${cursorHTML}`;

    const form = $(stage, "[data-form]");
    const home = $(stage, "[data-home]");
    const url = $(stage, ".jl-chrome span");
    const title = $(stage, "[data-title]");
    const cat = $(stage, "[data-cat]");
    const file = $(stage, "[data-file]");
    const desc = $(stage, "[data-desc]");
    const create = $(stage, "[data-create]");
    const fresh = $(stage, ".jl-card.is-new");
    const cursor = $(stage, ".app-cursor");

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      url.textContent = "localhost:8000/article/create";
      cat.textContent = "Beach";
      file.textContent = "No file chosen";
      title.textContent = "";
      desc.textContent = "";
    }, null, 0.001);
    tl.set(form, { autoAlpha: 1 }, 0).set(home, { autoAlpha: 0 }, 0);
    tl.set(cursor, { autoAlpha: 1, x: 900, y: 640 }, 0);

    let t = pointerTo(tl, stage, cursor, title, 0.3, { press: false });
    tl.call(() => title.classList.add("focus"), null, t);
    t = typeOn(tl, title, NEW[0], t, 1.1);
    tl.call(() => title.classList.remove("focus"), null, t);
    t = pointerTo(tl, stage, cursor, cat.parentElement, t + 0.1);
    tl.call(() => (cat.textContent = "Archipelago"), null, t);
    t = pointerTo(tl, stage, cursor, $(stage, ".btn-file"), t + 0.1);
    tl.call(() => (file.textContent = "raja-ampat.jpg"), null, t + 0.2);
    t = pointerTo(tl, stage, cursor, desc, t + 0.3, { press: false });
    tl.call(() => desc.classList.add("focus"), null, t);
    t = typeOn(tl, desc, "Raja Ampat is a regency in West Papua and also become the one of wonderful destinations in Indonesia by the magnificent nature scenery and coral reef.", t, 2.2);
    tl.call(() => desc.classList.remove("focus"), null, t);
    t = pointerTo(tl, stage, cursor, create, t + 0.1);

    // POST /article → redirect home; the new story sits first in the grid
    tl.call(() => (url.textContent = "localhost:8000"), null, t + 0.2);
    tl.to(form, { autoAlpha: 0, duration: 0.15 }, t + 0.2);
    tl.to(home, { autoAlpha: 1, duration: 0.15 }, t + 0.3);
    tl.to(cursor, { autoAlpha: 0, duration: 0.2 }, t + 0.3);
    tl.fromTo(fresh, { "--hl": 1, y: -10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "expo.out" }, t + 0.5);
    tl.to(fresh, { "--hl": 0, duration: 1.6, ease: "power1.in" }, t + 1.4);
    tl.to({}, { duration: 2.2 });
    return tl;
  },
};
