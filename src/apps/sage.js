import { gsap, $, $$, mi, typeOn, streamWords, wrapWords, pointerTo, cursorHTML } from "./core.js";

/*
  SageSearch, rebuilt from lib/ (colors.dart, search_section.dart,
  side_bar.dart, sources_section.dart, gemini_ans_section.dart).
  The loop follows the real flow: type a question, press Search, then
  Skeletonizer bones, ranked sources, and the answer streaming in over
  the WebSocket.
*/
const QUESTION = "How do Wayland compositors work?";

const SOURCES = [
  ["Wayland (protocol) - Wikipedia", "https://en.wikipedia.org/wiki/Wayland_(protocol)"],
  ["The Wayland Protocol: Introduction", "https://wayland-book.com/introduction.html"],
  ["niri: A scrollable-tiling Wayland compositor", "https://github.com/YaLTeR/niri"],
  ["Wayland architecture", "https://wayland.freedesktop.org/architecture.html"],
  ["Hyprland Wiki: Getting started", "https://wiki.hypr.land/Getting-Started"],
];

const ANSWER = `
<p>A Wayland compositor is the display server, window manager and compositor in one process (Source 1). Clients render their own buffers and hand them over, and the compositor decides where each one goes before drawing the final frame (Source 4).</p>
<p><b>How a frame gets drawn:</b></p>
<ul>
  <li><b>Clients draw:</b> every app renders into its own buffer, usually through EGL or Vulkan (Source 2).</li>
  <li><b>The compositor composites:</b> it places, scales and blends those buffers into one output image (Source 4).</li>
  <li><b>Input is routed:</b> keyboard and pointer events go only to the focused surface, which closes the snooping holes X11 had (Source 1).</li>
</ul>
<p>Scrollable-tiling compositors like niri lay windows out on an endless horizontal strip instead of splitting the screen (Source 3).</p>`;

const SUGGESTED = ["Covid-19 vaccine", "Mars colonization", "Quantum computer", "Climate change", "Artificial intelligence", "Cryptocurrency", "Black holes", "3D printing", "Virtual Reality", "Mobile Development"];
const RECENT = ["Flutter Development", "Machine Learning", "Web Design", "Blockchain", "Cloud Computing", "Data Science"];

export default {
  id: "sage",
  w: 1200,
  h: 660,
  still: 0.72,
  build(stage) {
    stage.innerHTML = `
      <header class="sg-top">
        <div class="sg-logo"><span><img src="/work/sage-icon.webp" alt="" /></span>SageSearch</div>
        <div class="sg-top__r"><button class="sg-sq">${mi("tune")}</button><button class="sg-av">${mi("person", "fill")}</button></div>
      </header>
      <aside class="sg-side">
        <a class="on">${mi("home", "fill")}Home</a>
        <a>${mi("explore")}Explore</a>
        <a>${mi("bookmark")}Saved</a>
        <a>${mi("settings")}Settings</a>
        <a>${mi("chat_bubble")}Feedback</a>
        <u class="sg-collapse">${mi("keyboard_arrow_left")}Collapse</u>
      </aside>

      <main class="sg-home" data-home>
        <h1>What do you want to know?</h1>
        <p class="sg-sub">Start with a detailed question - search for anything from quantum physics to pop culture</p>
        <div class="sg-box">
          <div class="sg-box__in">${mi("search")}<span data-q></span><span class="sg-hint" data-hint>Describe what you're looking for...</span></div>
          <hr />
          <div class="sg-box__row">
            <span class="sg-btn">${mi("auto_awesome")}Focus</span>
            <span class="sg-btn">${mi("add_circle")}Attach</span>
            <span class="sg-go" data-go>Search ${mi("arrow_forward")}</span>
          </div>
        </div>
        <h4>Suggested</h4>
        <div class="sg-chips">${SUGGESTED.map((s) => `<span>${s}</span>`).join("")}</div>
        <h4>Recent Searches</h4>
        <div class="sg-chips">${RECENT.map((s) => `<span>${s}</span>`).join("")}</div>
      </main>

      <main class="sg-chat" data-chat>
        <h2 data-title>${QUESTION}</h2>
        <div class="sg-srch">${mi("source")}Sources</div>
        <div class="sg-cards">
          ${SOURCES.map(([t, u]) => `<div class="sg-card"><b>${t}</b><small>${u}</small><i class="bone"></i><i class="bone"></i><i class="bone s"></i></div>`).join("")}
        </div>
        <p class="sg-label">Sage Search</p>
        <div class="sg-ansbox">
        <div class="sg-ans" data-ans>${wrapWords(ANSWER)}</div>
        <div class="sg-ans-bones" data-ans-bones>
          <i style="width:100%"></i><i style="width:76%"></i><i style="width:21%;margin-top:14px"></i>
          <i class="b" style="width:43%"></i><i class="b" style="width:14%"></i><i class="bb" style="width:51%"></i><i class="bb" style="width:92%"></i>
        </div>
        </div>
      </main>
      ${cursorHTML}`;

    const home = $(stage, "[data-home]");
    const chat = $(stage, "[data-chat]");
    const q = $(stage, "[data-q]");
    const hint = $(stage, "[data-hint]");
    const go = $(stage, "[data-go]");
    const cards = $$(stage, ".sg-card");
    const ans = $(stage, "[data-ans]");
    const bones = $(stage, "[data-ans-bones]");
    const cursor = $(stage, ".app-cursor");

    gsap.set(cursor, { x: 900, y: 600 });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
    tl.set(chat, { autoAlpha: 0, scrollTop: 0 }, 0).set(home, { autoAlpha: 1 }, 0).set(hint, { autoAlpha: 1 }, 0);
    tl.call(() => (q.textContent = ""), null, 0);
    tl.call(() => cards.forEach((c) => c.classList.add("is-loading")), null, 0);
    tl.set(bones, { autoAlpha: 1 }, 0).set(ans, { autoAlpha: 0 }, 0);
    tl.set(cursor, { autoAlpha: 1, x: 900, y: 600 }, 0);

    // type the question
    tl.set(hint, { autoAlpha: 0 }, 0.6);
    const typed = typeOn(tl, q, QUESTION, 0.6, 1.5);
    pointerTo(tl, stage, cursor, go, typed - 0.4);

    // navigate to the chat page (MaterialPageRoute: fade + slide up)
    const nav = typed + 0.75;
    tl.to(home, { autoAlpha: 0, duration: 0.25 }, nav);
    tl.fromTo(chat, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, nav + 0.1);
    tl.to(cursor, { autoAlpha: 0, duration: 0.2 }, nav);

    // Skeletonizer → sources arrive → answer streams over the socket
    const src = nav + 1.3;
    cards.forEach((c, i) => tl.call(() => c.classList.remove("is-loading"), null, src + i * 0.09));
    tl.to(bones, { autoAlpha: 0, duration: 0.2 }, src + 0.8);
    tl.set(ans, { autoAlpha: 1 }, src + 0.9);
    streamWords(tl, ans, src + 0.95, 5.2);
    tl.fromTo(chat, { scrollTop: 0 }, { scrollTop: 230, duration: 4.2, ease: "power1.inOut" }, src + 2);
    tl.to({}, { duration: 2.6 });
    tl.to(chat, { autoAlpha: 0, duration: 0.35 });
    return tl;
  },
};
