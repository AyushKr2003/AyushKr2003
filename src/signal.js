import gsap from "gsap";

/*
  One point per stargazer of niri-caelestia-shell. The points start as
  scattered noise and, as you scroll, settle into the shape of their own
  count. Neighbours link up into a constellation. The pointer pushes
  them apart and springs let them drift back.
*/
export function initSignal(ctx) {
  const section = document.querySelector(".signal");
  const pin = section.querySelector(".signal__pin");
  const canvas = section.querySelector("[data-signal]");
  const g = canvas.getContext("2d");

  let W = 0;
  let H = 0;
  let dpr = 1;
  let count = 171;
  let pts = [];
  const state = { p: ctx.reduced ? 1 : 0 };
  const mouse = { x: -9999, y: -9999 };
  let visible = false;

  function targets(n) {
    // rasterise the number off-screen and sample its pixels
    const off = document.createElement("canvas");
    const label = String(n);
    const portrait = H > W;
    const fs = H * (portrait ? 0.5 : 0.78);
    off.width = W;
    off.height = H;
    const o = off.getContext("2d");
    o.fillStyle = "#000";
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.font = `900 ${fs}px Anybody`;
    // Anybody's width axis isn't reachable through canvas fonts, so squeeze it by hand
    const sx = Math.min(0.62, (W * (portrait ? 0.9 : 0.7)) / o.measureText(label).width);
    o.save();
    o.translate(W * (W > 900 ? 0.6 : 0.5), H * 0.5);
    o.scale(sx, 1);
    o.fillText(label, 0, 0);
    o.restore();
    const data = o.getImageData(0, 0, W, H).data;
    const step = Math.max(4, Math.round(Math.min(W, H) / 120));
    const cand = [];
    for (let y = 0; y < H; y += step)
      for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 128) cand.push([x, y]);
    // greedy blue-noise pick: shrink the spacing until we have enough points
    let r = Math.sqrt((cand.length * step * step) / n) * 0.9;
    let picked = [];
    for (let tries = 0; tries < 12 && picked.length < n; tries++) {
      picked = [];
      const shuffled = cand.slice().sort(() => Math.random() - 0.5);
      for (const c of shuffled) {
        if (picked.every((q) => (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 > r * r)) picked.push(c);
        if (picked.length >= n) break;
      }
      r *= 0.88;
    }
    while (picked.length < n) picked.push(cand[(Math.random() * cand.length) | 0] || [W / 2, H / 2]);
    return picked.slice(0, n);
  }

  function build(n) {
    count = n;
    const t = targets(n);
    pts = t.map(([tx, ty], i) => ({
      tx,
      ty,
      sx: Math.random() * W,
      sy: Math.random() * H,
      x: Math.random() * W,
      y: Math.random() * H,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      d: Math.random() * 0.35, // per-point delay, so the shape condenses rather than snaps
      tw: Math.random() * Math.PI * 2,
      r: (W < 700 ? 0.9 : 1.3) + Math.random() * (W < 700 ? 1.1 : 1.6),
    }));
  }

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = pin.clientWidth;
    H = pin.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    build(count);
  }
  resize();
  new ResizeObserver(resize).observe(pin);

  pin.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  pin.addEventListener("pointerleave", () => (mouse.x = mouse.y = -9999));
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(pin);

  const ease = gsap.parseEase("power3.inOut");
  const accent = "255,74,28";

  gsap.ticker.add((time) => {
    if (!visible) return;
    const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#e9e5db";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const assembled = ease(Math.min(1, state.p / 0.7));
    const R = 110;

    for (const p of pts) {
      const k = ease(Math.max(0, Math.min(1, (state.p / 0.7 - p.d) / (1 - 0.35))));
      const drift = (1 - k) * 18;
      const hx = p.sx + (p.tx - p.sx) * k + Math.sin(time * 0.6 + p.tw) * drift;
      const hy = p.sy + (p.ty - p.sy) * k + Math.cos(time * 0.5 + p.tw) * drift;
      // spring offset pushed by the pointer
      const dx = hx + p.ox - mouse.x;
      const dy = hy + p.oy - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < R * R && !ctx.reduced) {
        const d = Math.sqrt(d2) || 1;
        const f = ((R - d) / R) * 2.4;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
      p.vx += -p.ox * 0.06;
      p.vy += -p.oy * 0.06;
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.ox += p.vx;
      p.oy += p.vy;
      p.x = hx + p.ox;
      p.y = hy + p.oy;
    }

    // constellation lines, only once the shape has mostly formed
    if (assembled > 0.2) {
      const L = Math.min(W, H) * 0.075;
      g.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > L * L) continue;
          const alpha = (1 - Math.sqrt(d2) / L) * 0.55 * (assembled - 0.2) * 1.25;
          g.strokeStyle = `rgba(${accent},${alpha.toFixed(3)})`;
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.stroke();
        }
      }
    }

    g.fillStyle = fg;
    for (const p of pts) {
      const tw = 0.55 + 0.45 * Math.sin(time * 2 + p.tw);
      g.globalAlpha = 0.35 + 0.65 * tw;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });

  if (!ctx.reduced) {
    gsap.to(state, {
      p: 1,
      ease: "none",
      scrollTrigger: { trigger: pin, start: "top top", end: "+=140%", pin: true, scrub: 0.8 },
    });
    gsap.from(".signal__stats > div", {
      y: 30,
      autoAlpha: 0,
      stagger: 0.08,
      duration: 0.9,
      ease: "expo.out",
      scrollTrigger: { trigger: pin, start: "top 30%", once: true },
    });
  }

  return {
    rebuild(n) {
      if (n && n !== count) build(n);
    },
  };
}
