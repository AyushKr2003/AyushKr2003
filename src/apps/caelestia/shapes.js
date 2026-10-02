/*
  Material 3 Expressive shapes (as Caelestia v2's MaterialShape uses them),
  sampled as polar outlines so any two can morph point-for-point.
  r(θ) is in units of the shape's half-size; paths are built for a 100×100 box.
*/
const N = 144;

const SHAPES = {
  circle: () => 1,
  // scalloped "cookies": n soft lobes
  cookie4: (t) => 0.86 + 0.1 * Math.cos(4 * t),
  cookie6: (t) => 0.88 + 0.08 * Math.cos(6 * t),
  cookie9: (t) => 0.9 + 0.075 * Math.cos(9 * t),
  cookie12: (t) => 0.92 + 0.06 * Math.cos(12 * t),
  // sunny: 8 rounded rays
  sunny: (t) => 0.86 + 0.13 * Math.pow(Math.cos(4 * t) * 0.5 + 0.5, 1.6),
  softBurst: (t) => 0.84 + 0.14 * Math.pow(Math.cos(5 * t) * 0.5 + 0.5, 2),
  // rounded square (squircle)
  square: (t) => {
    const c = Math.abs(Math.cos(t));
    const s = Math.abs(Math.sin(t));
    return 0.96 / Math.pow(Math.pow(c, 5) + Math.pow(s, 5), 1 / 5);
  },
  // diamond: squircle turned 45°
  diamond: (t) => SHAPES.square(t + Math.PI / 4) * 0.8,
  // gem: soft hexagon
  gem: (t) => 0.92 / Math.pow(Math.pow(Math.abs(Math.cos(1.5 * t)), 4) * 0.12 + 1, 0.5),
};

export function points(name, rotate = 0) {
  const f = SHAPES[name] || SHAPES.circle;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = f(t) * 50;
    pts.push([50 + r * Math.cos(t + rotate), 50 + r * Math.sin(t + rotate)]);
  }
  return pts;
}

export function pathFrom(pts) {
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  return d + "Z";
}

export const shapePath = (name, rotate = 0) => pathFrom(points(name, rotate));

// morph two shapes; t in 0..1
export function morph(a, b, t) {
  const A = points(a);
  const B = points(b);
  return pathFrom(A.map((p, i) => [p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t]));
}

/* inline SVG holding a shape; use with `fill: currentColor` */
export const shapeSVG = (name, cls = "", rotate = 0) =>
  `<svg class="m3s ${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${shapePath(name, rotate)}"/></svg>`;

/* wavy arc (M3 expressive progress): centre (cx, cy), radius r, from a0 to a1 (radians) */
export function wavyArc(cx, cy, r, a0, a1, amp = 2.2, waves = 14, phase = 0) {
  const steps = 90;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const rr = r + Math.sin(i * ((waves * Math.PI * 2) / steps) + phase) * amp;
    d += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d;
}
