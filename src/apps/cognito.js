import { gsap, $, $$, mi, centre } from "./core.js";

/*
  CognitoAI, rebuilt from lib/ as one phone screen: 360×780 dp.
  - home_page.dart: AppBar (menu, centred title), the assistant in a
    120px #D1F3F9 circle, a speech bubble with a square top-left corner,
    "Here are a few commands" and three FeatureBoxes (pallete.dart colours)
  - the entrances are the app's own animate_do widgets: BounceInDown on the
    title, ZoomIn on the avatar and the FAB, FadeInRight on the bubble,
    SlideInLeft on the boxes with a growing delay
  - the FAB starts speech_to_text; pressing it again sends the words to
    openai_service.dart, which first asks GPT-3.5 "does this message want
    to generate an AI picture?" and routes to ChatGPT or DALL·E. Text
    answers replace the bubble's text and are read out by flutter_tts;
    an image replaces the bubble.
  The mono strip is an annotation of what the service is doing, not app UI.
  The app's font is Cera Pro; Google Sans Flex stands in for it.
*/
const BOXES = [
  ["#a5e7f4", "ChatGPT", "A smarter way to stay organized and informed with ChatGPT"],
  ["#9dcaeb", "Dall-E", "Get inspired and stay creative with your personal assistant powered by Dall-E"],
  ["#a2eeef", "Smart Voice Assistant", "Get the best of both worlds with a voice assistant powered by Dall-E and ChatGPT"],
];
const ASK_1 = "what is the tallest mountain in india";
const ANSWER_1 =
  "Kangchenjunga is the tallest mountain in India. At 8,586 metres it is also the third highest mountain in the world, on the border of Sikkim and Nepal.";
const ASK_2 = "paint the sun setting over the hills";

// what DALL·E sends back, drawn as layered hills at dusk
const PAINTING = `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="cg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2a5c"/><stop offset=".55" stop-color="#e2726a"/><stop offset="1" stop-color="#f6c178"/></linearGradient>
    <radialGradient id="cg-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff4cf"/><stop offset=".6" stop-color="#ffd27a"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="320" height="240" fill="url(#cg-sky)"/>
  <circle cx="190" cy="150" r="58" fill="url(#cg-sun)"/>
  <path d="M0 160 Q60 120 120 150 T240 140 T320 150 V240 H0Z" fill="#a4566b"/>
  <path d="M0 185 Q80 150 150 178 T320 170 V240 H0Z" fill="#6e3a5e"/>
  <path d="M0 210 Q90 185 170 205 T320 200 V240 H0Z" fill="#3b2447"/>
  <path d="M0 232 Q120 214 220 228 T320 226 V240 H0Z" fill="#1f1530"/>
</svg>`;

export default {
  id: "cognito",
  w: 360,
  h: 780,
  still: 0.5,
  build(stage) {
    stage.innerHTML = `
      <div class="cg-status"><span data-clock>9:41</span><span class="cg-sig">▾◢▮</span></div>
      <header class="cg-bar">${mi("menu")}<h1 data-title>CognitoAI</h1><i></i></header>
      <main class="cg-body">
        <div class="cg-avatar" data-avatar><span></span><img src="/work/cognito-assistant.webp" alt="" /></div>
        <div class="cg-bubble" data-bubble><p data-say>Good Morning, what task can I do for you?</p></div>
        <figure class="cg-image" data-image>${PAINTING}</figure>
        <div data-cmds>
          <h2 class="cg-h" data-h>Here are a few commands</h2>
          ${BOXES.map(([c, h, d]) => `<article class="cg-box" style="--c:${c}"><b>${h}</b><p>${d}</p></article>`).join("")}
        </div>
      </main>
      <button class="cg-fab" data-fab><span data-ic-mic>${mi("mic")}</span><span data-ic-stop>${mi("stop")}</span></button>
      <i class="cg-ripple" data-ripple></i>
      <div class="cg-note mono-note" data-note><span data-note-a></span><span data-note-b></span></div>
      <i class="cg-touch" data-touch></i>`;

    const title = $(stage, "[data-title]");
    const avatar = $(stage, "[data-avatar]");
    const bubble = $(stage, "[data-bubble]");
    const say = $(stage, "[data-say]");
    const image = $(stage, "[data-image]");
    const cmds = $(stage, "[data-cmds]");
    const head = $(stage, "[data-h]");
    const boxes = $$(stage, ".cg-box");
    const fab = $(stage, "[data-fab]");
    const mic = $(stage, "[data-ic-mic]");
    const stop = $(stage, "[data-ic-stop]");
    const ripple = $(stage, "[data-ripple]");
    const note = $(stage, "[data-note]");
    const noteA = $(stage, "[data-note-a]");
    const noteB = $(stage, "[data-note-b]");
    const touch = $(stage, "[data-touch]");

    const clock = () => {
      const d = new Date();
      $(stage, "[data-clock]").textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    clock();
    setInterval(clock, 30000);

    // "Show taps", as on the Musixir screen
    function tap(tl, el, at) {
      tl.call(() => {
        const c = centre(stage, el);
        gsap.set(touch, { x: c.x, y: c.y });
      }, null, at);
      tl.fromTo(touch, { autoAlpha: 0.85, scale: 0.55 }, { autoAlpha: 0, scale: 1.25, duration: 0.45, ease: "power2.out", immediateRender: false }, at);
      tl.fromTo(el, { scale: 1 }, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut", immediateRender: false }, at);
      return at + 0.3;
    }
    const listening = (on) => {
      mic.style.display = on ? "none" : "";
      stop.style.display = on ? "" : "none";
    };
    const noteSet = (a, b = "") => {
      noteA.textContent = a;
      noteB.textContent = b;
    };
    // speech_to_text: the words arrive a few at a time while you talk
    function hear(tl, words, at) {
      const w = words.split(" ");
      w.forEach((_, i) => tl.call(() => noteSet("speech_to_text", `“${w.slice(0, i + 1).join(" ")}”`), null, at + i * 0.22));
      return at + w.length * 0.22;
    }
    // the mic ripple while listening
    const pulse = gsap.timeline({ paused: true, repeat: -1 }).fromTo(ripple, { scale: 1, autoAlpha: 0.5 }, { scale: 1.9, autoAlpha: 0, duration: 1.1, ease: "power1.out" });

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      listening(false);
      say.textContent = "Good Morning, what task can I do for you?";
      bubble.classList.remove("is-answer");
      pulse.pause(0);
    }, null, 0.001);
    tl.set([image, note, ripple], { autoAlpha: 0 }, 0);
    tl.set([bubble, cmds], { autoAlpha: 1, display: "" }, 0);
    tl.set(image, { display: "none" }, 0);

    // animate_do entrances (durations are animate_do's defaults)
    tl.fromTo(title, { y: -60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: "bounce.out" }, 0.05);
    tl.fromTo(avatar, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.05);
    tl.fromTo(bubble, { x: 80, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.15);
    tl.fromTo([head, ...boxes], { x: -360 }, { x: 0, duration: 0.8, ease: "power2.out", stagger: 0.12 }, 0.2);
    tl.fromTo(fab, { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(1.6)" }, 0.6);

    // 1 · a question → ChatGPT → spoken answer
    let t = tap(tl, fab, 2.0);
    tl.call(() => (listening(true), pulse.restart()), null, t - 0.2);
    tl.to(note, { autoAlpha: 1, duration: 0.2 }, t);
    t = hear(tl, ASK_1, t + 0.2);
    t = tap(tl, fab, t + 0.4);
    tl.call(() => (listening(false), pulse.pause(0), noteSet("gpt-3.5-turbo", "image request? → no")), null, t - 0.2);
    tl.set(ripple, { autoAlpha: 0 }, t);
    tl.call(() => noteSet("gpt-3.5-turbo", "chat/completions…"), null, t + 0.9);
    tl.to(cmds, { autoAlpha: 0, duration: 0.3 }, t + 1.5);
    tl.call(() => {
      say.textContent = ANSWER_1;
      bubble.classList.add("is-answer");
      noteSet("flutter_tts", "speaking ▮▮▮▯▮");
    }, null, t + 1.6);
    tl.fromTo(bubble, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: "power2.out", immediateRender: false }, t + 1.6);
    t += 5.2;

    // 2 · a picture → DALL·E → the image takes the bubble's place
    t = tap(tl, fab, t);
    tl.call(() => (listening(true), pulse.restart()), null, t - 0.2);
    t = hear(tl, ASK_2, t + 0.2);
    t = tap(tl, fab, t + 0.4);
    tl.call(() => (listening(false), pulse.pause(0), noteSet("gpt-3.5-turbo", "image request? → yes")), null, t - 0.2);
    tl.set(ripple, { autoAlpha: 0 }, t);
    tl.call(() => noteSet("dall-e", "images/generations…"), null, t + 0.9);
    tl.to(bubble, { autoAlpha: 0, duration: 0.3 }, t + 1.7);
    tl.set(bubble, { display: "none" }, t + 2.0);
    tl.set(image, { display: "block" }, t + 2.0);
    tl.fromTo(image, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "power2.out", immediateRender: false }, t + 2.0);
    tl.fromTo($(image, "svg"), { filter: "blur(14px) saturate(0.4)" }, { filter: "blur(0px) saturate(1)", duration: 1.4, ease: "power2.out", immediateRender: false }, t + 2.0);
    tl.call(() => noteSet("dall-e", "1 image · 1024×1024"), null, t + 2.2);
    tl.to(note, { autoAlpha: 0, duration: 0.3 }, t + 4.6);
    tl.to({}, { duration: 1.2 }, t + 4.6);
    return tl;
  },
};
