import gsap from "gsap";

/*
  Four planes start stacked flat, so they read as one card (the app).
  Scrolling tilts the stack into an axonometric view and explodes it
  into its layers. A packet then drops through them one at a time, the
  way a tap travels from the UI down to the machine.
*/
export function initLayers(ctx) {
  const section = document.querySelector(".layers");
  const pin = section.querySelector(".layers__pin");
  const stack = section.querySelector("[data-stack]");
  const planes = [...section.querySelectorAll("[data-plane]")];
  const items = [...section.querySelectorAll("[data-layer]")];
  const packet = section.querySelector("[data-packet]");

  let current = -1;
  function setLayer(i) {
    if (i === current) return;
    current = i;
    planes.forEach((p, j) => p.classList.toggle("is-on", j === i));
    items.forEach((li, j) => li.classList.toggle("is-on", j === i));
  }

  if (ctx.reduced) {
    gsap.set(stack, { rotateX: 56, rotateZ: -40 });
    planes.forEach((p, i) => gsap.set(p, { z: (1.5 - i) * 90 }));
    items.forEach((li) => li.classList.add("is-on"));
    section.classList.add("is-static");
    return;
  }

  const mm = gsap.matchMedia();
  mm.add(
    { desktop: "(min-width: 1001px)", mobile: "(max-width: 1000px)" },
    ({ conditions }) => {
      const gap = conditions.desktop ? 0.24 : 0.2; // fraction of stack height
      const spread = () => stack.offsetHeight * gap;
      planes.forEach((p, i) => gsap.set(p, { z: -i * 0.5 }));
      gsap.set(stack, { rotateX: 0, rotateZ: 0, y: 0 });
      gsap.set(packet, { z: () => spread() * 2.6, autoAlpha: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: conditions.desktop ? pin : stack,
          start: conditions.desktop ? "top top" : "top 85%",
          end: conditions.desktop ? "+=320%" : "bottom 20%",
          pin: conditions.desktop ? pin : false,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const p = self.progress;
            // layers light up as the packet passes through them
            if (p < 0.3) setLayer(-1);
            else setLayer(Math.min(3, Math.floor(((p - 0.3) / 0.68) * 4)));
          },
          onLeaveBack: () => setLayer(-1),
        },
      });

      // 0 → .3 : tilt + explode
      tl.to(stack, { rotateX: 57, rotateZ: -42, y: () => stack.offsetHeight * 0.06, duration: 0.3, ease: "power2.inOut" }, 0);
      planes.forEach((p, i) => {
        tl.to(p, { z: () => (1.5 - i) * spread(), duration: 0.3, ease: "power3.inOut" }, 0.02 + i * 0.015);
      });

      // .3 → 1 : packet descends, stopping briefly on each plane
      tl.to(packet, { autoAlpha: 1, duration: 0.04 }, 0.28);
      planes.forEach((_, i) => {
        const at = 0.3 + i * 0.17;
        tl.to(packet, { z: () => (1.5 - i) * spread() + 2, duration: 0.09, ease: "power2.inOut" }, at);
        tl.to(planes[i], { y: -10, duration: 0.04, yoyo: true, repeat: 1, ease: "sine.inOut" }, at + 0.07);
      });
      tl.to(packet, { z: () => -spread() * 2.4, autoAlpha: 0, duration: 0.06, ease: "power2.in" }, 0.96);

      // closing: the stack compresses back so the next section starts clean
      if (conditions.desktop) {
        tl.to(stack, { scale: 0.92, duration: 0.08 }, 0.92);
      }
    }
  );
}
