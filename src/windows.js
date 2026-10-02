import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountApp, loadAppFonts } from "./apps/core.js";
import { initGallery } from "./apps/gallery.js";
import sage from "./apps/sage.js";
import niri from "./apps/niri.js";
import nexvote from "./apps/nexvote.js";
import musixir from "./apps/musixir.js";
import journeylog from "./apps/journeylog.js";
import omacale from "./apps/omacale.js";

const APPS = { sage, niri, nexvote, musixir, journeylog, omacale };

/*
  Selected work behaves like niri, the scrollable-tiling compositor my
  shell runs on. Projects are columns on an endless horizontal strip.
  Widths follow niri's presets, the column nearest the centre gets the
  focus ring, and scrolling snaps the way niri centres a focused
  column. The minimap at the bottom is niri's overview, shrunk down.
*/
export function initWindows(ctx) {
  const section = document.querySelector(".windows");
  const pin = section.querySelector(".windows__pin");
  const strip = section.querySelector("[data-strip]");
  const cols = [...strip.querySelectorAll("[data-col]")];
  const mmTrack = section.querySelector("[data-minimap]");
  const mmView = section.querySelector("[data-minimap-view]");

  const mmCells = cols.map(() => mmTrack.appendChild(document.createElement("i")));

  let distance = 0;
  let snaps = [];
  function measure() {
    distance = Math.max(0, strip.scrollWidth - innerWidth);
    const total = strip.scrollWidth;
    cols.forEach((c, i) => (mmCells[i].style.flex = `${c.offsetWidth} 0 0`));
    mmView.style.width = `${(innerWidth / total) * 100}%`;
    // snap points centre each column, clamped at both ends
    snaps = cols.map((c) => {
      const centre = c.offsetLeft + c.offsetWidth / 2 - innerWidth / 2;
      return distance ? Math.min(1, Math.max(0, centre / distance)) : 0;
    });
  }
  measure();

  let focus = -1;
  function setFocus(i) {
    if (i === focus) return;
    focus = i;
    cols.forEach((c, j) => c.classList.toggle("is-focus", j === i));
    mmCells.forEach((m, j) => m.classList.toggle("is-focus", j === i));
  }

  function update(x) {
    const mid = x + innerWidth / 2;
    let best = 0;
    let bestD = Infinity;
    cols.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setFocus(best);
    mmView.style.left = `${(x / strip.scrollWidth) * 100}%`;
  }

  const tween = gsap.to(strip, {
    x: () => -distance,
    ease: "none",
    scrollTrigger: {
      trigger: pin,
      start: "top top",
      end: () => `+=${distance * 1.15}`,
      pin: true,
      scrub: ctx.reduced ? true : 0.7,
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onUpdate: (self) => update(self.progress * distance),
    },
  });
  update(0);

  /* Snap like niri centring a column. ScrollTrigger's own snap fights
     Lenis's interpolation, so we wait for the scroll to settle and then
     let Lenis glide to the nearest column. */
  const yFor = (i) => {
    const st = tween.scrollTrigger;
    return st.start + snaps[i] * (st.end - st.start);
  };
  let settle;
  ctx.lenis?.on("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      const st = tween.scrollTrigger;
      const y = ctx.lenis.animatedScroll;
      if (y <= st.start + 2 || y >= st.end - 2) return;
      let best = 0;
      snaps.forEach((_, i) => {
        if (Math.abs(yFor(i) - y) < Math.abs(yFor(best) - y)) best = i;
      });
      const target = yFor(best);
      if (Math.abs(target - y) > 2) ctx.lenis.scrollTo(target, { duration: 0.7, easing: (t) => 1 - Math.pow(1 - t, 3) });
    }, 160);
  });

  // keyboard: ← → move focus between columns while the strip is on screen
  addEventListener("keydown", (e) => {
    const st = tween.scrollTrigger;
    if (!st.isActive || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    if (document.activeElement?.matches("input, textarea")) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(cols.length - 1, focus + (e.key === "ArrowRight" ? 1 : -1)));
    const y = yFor(next);
    if (ctx.lenis) ctx.lenis.scrollTo(y, { duration: 0.9 });
    else scrollTo(0, y);
  });

  // keep keyboard focus inside the visible column
  cols.forEach((c, i) =>
    c.addEventListener("focusin", () => {
      const y = yFor(i);
      if (Math.abs(scrollY - y) > 4) ctx.lenis ? ctx.lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    })
  );

  // window entrance: columns slide in from the right, slightly staggered, like spawning windows
  if (!ctx.reduced) {
    gsap.from(cols, {
      xPercent: 30,
      autoAlpha: 0,
      duration: 1.1,
      ease: "expo.out",
      stagger: 0.07,
      scrollTrigger: { trigger: section, start: "top 60%", once: true },
    });
  }

  // each window runs a rebuilt copy of the real app UI
  ScrollTrigger.create({ trigger: section, start: "top 250%", once: true, onEnter: loadAppFonts });
  section.querySelectorAll("[data-app]").forEach((viz) => mountApp(viz, APPS[viz.dataset.app], ctx));
  initGallery(ctx);
  ScrollTrigger.addEventListener("refreshInit", measure);
}
