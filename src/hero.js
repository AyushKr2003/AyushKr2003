import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
  The name is set in Anybody, a variable font with a 50–150 width axis.
  1. Fit: each line gets its own base width so both lines run exactly
     edge to edge at the same cap height. "AYUSH" goes wide and
     "KUMAR SINGH" goes condensed.
  2. Lens: letters near the pointer widen and gain weight. The rest of
     the line gives that width back, so the line length stays fixed and
     the letters trade space instead of pushing the layout.
  3. Descent: scrolling out of the hero pulls every line toward the
     narrowest width, as if the type were being compressed.
*/
const MIN = 50;
const MAX = 150;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initHero(ctx) {
  const h1 = document.querySelector("[data-lens]");
  const lines = [...h1.querySelectorAll("[data-line]")].map((el) => {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-hidden", "true");
    const chars = [...text].map((c) => {
      const s = document.createElement("span");
      s.className = c === " " || c === " " ? "ch ch--sp" : "ch";
      s.textContent = c === " " ? " " : c;
      el.appendChild(s);
      return { el: s, w: 100, g: 800, tw: 100 };
    });
    return { el, chars, base: 100, corr: 0, ls: 0 };
  });

  const state = { intro: ctx.reduced ? 1 : 0, descent: 0, px: -1, py: -1, lastMove: 0, active: true };

  function applyWidth(line, w) {
    line.chars.forEach((c) => c.el.style.setProperty("--w", w));
  }

  // binary-search the width axis until the line fills the h1
  function fit() {
    const avail = h1.clientWidth;
    const widthAt = (line, w) => {
      applyWidth(line, w);
      return line.el.getBoundingClientRect().width;
    };
    lines.forEach((line) => {
      line.el.style.fontSize = "";
      line.el.style.width = "max-content";
      // a short line can't fill even at full width: scale it up instead, so
      // it sits mid-axis and the lens has room to move both ways
      if (widthAt(line, MAX) < avail) {
        line.el.style.fontSize = `${avail / widthAt(line, 108)}em`;
      }
      let lo = MIN;
      let hi = MAX;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        if (widthAt(line, mid) > avail) hi = mid;
        else lo = mid;
      }
      line.el.style.width = "";
      line.base = lo;
      line.corr = 0;
      line.ls = 0;
      line.el.style.letterSpacing = "";
      line.chars.forEach((c) => (c.w = c.tw = lo));
    });
  }
  fit();
  new ResizeObserver(() => fit()).observe(h1);

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      state.px = e.clientX;
      state.py = e.clientY;
      state.lastMove = performance.now();
    },
    { passive: true }
  );

  /* Width isn't linear in the wdth axis, so the lens slowly shortens the
     line. Every few frames, measure and nudge a correction so both
     lines stay flush with the edge. Once a line is maxed out at 150,
     the leftover goes into letter-spacing. */
  let n = 0;
  function correct() {
    if (state.intro < 1 || state.descent > 0) return;
    const avail = h1.clientWidth;
    lines.forEach((line) => {
      const a = line.chars[0].el.getBoundingClientRect();
      const b = line.chars[line.chars.length - 1].el.getBoundingClientRect();
      const err = avail - (b.right - a.left);
      if (Math.abs(err) < 1) return;
      const capped = line.base + line.corr >= MAX - 0.5 && err > 0;
      if (capped || line.ls > 0) {
        line.ls = Math.max(0, line.ls + (err / (line.chars.length - 1)) * 0.3);
        line.el.style.letterSpacing = `${line.ls.toFixed(2)}px`;
      }
      if (!capped) line.corr = clamp(line.corr + err * 0.015, -40, 40);
    });
  }

  function frame(t) {
    if (!state.active) return;
    if (++n % 5 === 0) correct();
    const now = performance.now();
    const idle = now - state.lastMove > 2200;
    let px = state.px;
    let py = state.py;
    const r = h1.getBoundingClientRect();
    // when the pointer is gone (or on touch), a slow drift keeps the name breathing
    if (idle || px < 0) {
      const s = now / 1000;
      px = r.left + r.width * (0.5 + 0.42 * Math.sin(s * 0.45));
      py = r.top + r.height * (0.5 + 0.45 * Math.sin(s * 0.31 + 1.3));
    }
    const sigma = innerWidth * (idle ? 0.11 : 0.085);
    const amp = ctx.reduced ? 0 : (idle ? 38 : 62) * state.intro * (1 - state.descent);

    lines.forEach((line) => {
      const fitBase = clamp(line.base + line.corr, MIN, MAX);
      const base = lerp(MIN, fitBase, state.intro) * (1 - state.descent) + MIN * state.descent;
      const f = line.chars.map((c) => {
        const b = c.el.getBoundingClientRect();
        const dx = b.left + b.width / 2 - px;
        const dy = (b.top + b.height / 2 - py) * 1.6;
        return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      });
      const mean = f.reduce((a, b) => a + b, 0) / f.length;
      line.chars.forEach((c, i) => {
        // give back what the lens took, so total width stays put
        c.tw = clamp(base + amp * (f[i] - mean), MIN, MAX);
        const gTarget = ctx.reduced ? 800 : 620 + 280 * f[i] * state.intro;
        c.w += (c.tw - c.w) * 0.14;
        c.g += (gTarget - c.g) * 0.14;
        c.el.style.setProperty("--w", c.w.toFixed(2));
        c.el.style.setProperty("--g", c.g.toFixed(0));
      });
    });
  }
  gsap.ticker.add(frame);

  const section = document.querySelector(".surface");
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom top",
    onToggle: (self) => (state.active = self.isActive),
    onUpdate: (self) => (state.descent = ctx.reduced ? 0 : gsap.parseEase("power2.in")(self.progress)),
  });

  if (!ctx.reduced) {
    // the two lines part at different speeds on the way down
    gsap.to(lines[0].el, {
      yPercent: -55,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(lines[1].el, {
      yPercent: -18,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
    });
    gsap.set([".surface__meta", ".surface__foot"], { autoAlpha: 0 });
    gsap.set(".name .ch", { yPercent: 70, autoAlpha: 0 });
  }

  return {
    intro(fromBoot) {
      if (ctx.reduced) return;
      const tl = gsap.timeline({ delay: fromBoot ? 0 : 0.15 });
      tl.to(".name .ch", { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.035 }, 0);
      tl.to(state, { intro: 1, duration: 1.8, ease: "expo.inOut" }, 0);
      tl.to([".surface__meta", ".surface__foot"], { autoAlpha: 1, duration: 0.8, ease: "power2.out", stagger: 0.1 }, 0.7);
      tl.from(".surface__foot", { y: 24, duration: 1, ease: "expo.out" }, 0.8);
    },
  };
}
