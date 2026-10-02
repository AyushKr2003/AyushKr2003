/*
  Caelestia v2's frame + drawer surface, for the browser.

  A WebGL2 port of omacale's shaders/blob.frag (itself a port of Caelestia's
  plugin/src/Caelestia/Blobs/shaders/blob.frag): the screen frame (an
  inverted rounded rect) and every open drawer are signed distance fields
  merged with a circular smooth-min, so drawers grow out of the frame with
  round fillets. Also ported: BlobFill.js (per-corner radii that square up
  near the frame and neighbours) and BlobDeform.qml (the spring "jelly").
*/

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 res;
uniform float dpr;
uniform float smoothing;
uniform float holeRadius;
uniform vec4 hole;
uniform vec4 color;
uniform vec4 rects[10];
uniform vec4 radii[10];
uniform vec4 deforms[10];
out vec4 fragColor;

float sdRoundedBox(vec2 p, vec2 c, vec2 hs, float r) {
  r = min(r, min(hs.x, hs.y));
  vec2 d = abs(p - c) - hs + vec2(r);
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
}
float sdRoundedBox4(vec2 p, vec2 c, vec2 hs, vec4 r) {
  p -= c;
  r.xy = (p.x > 0.0) ? r.xy : r.wz;
  r.x = (p.y > 0.0) ? r.y : r.x;
  vec2 q = abs(p) - hs + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}
float sdBox(vec2 p, vec2 c, vec2 hs) {
  vec2 d = abs(p - c) - hs;
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
}
float smin(float a, float b, float k) {
  return max(k, min(a, b)) - length(max(vec2(k) - vec2(a, b), vec2(0.0)));
}
float smaxSharpA(float a, float b, float k) {
  float sm = min(-k, max(a, b)) + length(max(vec2(a, b) + vec2(k), vec2(0.0)));
  return max(a, b) + (sm - max(a, b)) * smoothstep(0.0, k * 0.5, -a);
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, res.y * dpr - gl_FragCoord.y) / dpr;
  float k = smoothing;
  bool framed = holeRadius >= 0.0;
  vec2 innerC = hole.xy + hole.zw * 0.5;
  vec2 innerH = hole.zw * 0.5;

  float d[10];
  vec2 ctrs[10];
  vec2 halves[10];
  for (int i = 0; i < 10; i++) {
    vec4 r = rects[i];
    ctrs[i] = r.xy + r.zw * 0.5;
    halves[i] = r.zw * 0.5;
    if (r.z <= 0.5 || r.w <= 0.5) { d[i] = 1e10; continue; }
    vec3 m = deforms[i].xyz;
    if (m.x == 0.0 && m.z == 0.0) m = vec3(1.0, 0.0, 1.0);
    vec2 hs = r.zw * 0.5;
    float det = m.x * m.z - m.y * m.y;
    float invDet = abs(det) > 1e-6 ? 1.0 / det : 1.0;
    mat2 inv = mat2(m.z * invDet, -m.y * invDet, -m.y * invDet, m.x * invDet);
    float halfTr = 0.5 * (m.x + m.z);
    float halfDiff = 0.5 * (m.x - m.z);
    float minEig = halfTr - sqrt(halfDiff * halfDiff + m.y * m.y);
    vec2 sh = vec2(abs(m.x) * hs.x + abs(m.y) * hs.y, abs(m.y) * hs.x + abs(m.z) * hs.y);
    halves[i] = sh;
    vec2 c = ctrs[i];
    float di = sdRoundedBox4(c + inv * (pixel - c), c, hs, radii[i]);
    di *= max(minEig, 0.01);
    if (framed) {
      float distY0 = (c.y + sh.y) - (innerC.y - innerH.y);
      float distY1 = (innerC.y + innerH.y) - (c.y - sh.y);
      float distX0 = (c.x + sh.x) - (innerC.x - innerH.x);
      float distX1 = (innerC.x + innerH.x) - (c.x - sh.x);
      float yProx = 1.0 - min(smoothstep(0.0, k, distY0), smoothstep(0.0, k, distY1));
      float xProx = 1.0 - min(smoothstep(0.0, k, distX0), smoothstep(0.0, k, distX1));
      vec2 q = abs(pixel - c) - sh;
      vec2 qp = max(q, vec2(0.0));
      float cornerLen = length(qp);
      float gradX = qp.x / max(cornerLen, 0.001);
      float gradY = qp.y / max(cornerLen, 0.001);
      float faceY = smoothstep(-4.0, 4.0, q.y - q.x);
      float faceX = 1.0 - faceY;
      float t = smoothstep(0.0, 2.0, cornerLen);
      float xWeight = mix(faceX, gradX, t);
      float yWeight = mix(faceY, gradY, t);
      di *= 1.0 + (xProx * xWeight + yProx * yWeight) * 3.0;
    }
    d[i] = di;
  }

  float merged = 1e10;
  for (int i = 0; i < 10; i++) merged = min(merged, d[i]);
  for (int i = 0; i < 10; i++) {
    if (d[i] >= 1e9) continue;
    for (int j = i + 1; j < 10; j++) {
      if (d[j] >= 1e9 || max(d[i], d[j]) >= k) continue;
      merged = min(merged, smin(d[i], d[j], k));
    }
  }

  if (framed) {
    vec2 outerC = res * 0.5;
    vec2 outerH = res * 0.5 + vec2(50.0);
    float dOuter = sdBox(pixel, outerC, outerH) - 1.0;
    float dInner = sdRoundedBox(pixel, innerC, innerH, holeRadius);
    float innerTop = innerC.y - innerH.y, innerBot = innerC.y + innerH.y;
    float innerLeft = innerC.x - innerH.x, innerRight = innerC.x + innerH.x;
    float outerTop = outerC.y - outerH.y, outerBot = outerC.y + outerH.y;
    float outerLeft = outerC.x - outerH.x, outerRight = outerC.x + outerH.x;
    float sinkValue = 0.0;
    float preOff = k * (2.0 - sqrt(2.0)) * 0.5;
    for (int i = 0; i < 10; i++) {
      if (d[i] >= 1e9) continue;
      vec2 ctr = ctrs[i];
      vec2 sh = halves[i];
      float topPen = clamp(innerTop - (ctr.y + sh.y) - preOff, 0.0, innerTop - outerTop);
      float botPen = clamp((ctr.y - sh.y) - innerBot - preOff, 0.0, outerBot - innerBot);
      float leftPen = clamp(innerLeft - (ctr.x + sh.x) - preOff, 0.0, innerLeft - outerLeft);
      float rightPen = clamp((ctr.x - sh.x) - innerRight - preOff, 0.0, outerRight - innerRight);
      float hLat = max(abs(pixel.x - ctr.x) - sh.x, 0.0);
      float vLat = max(abs(pixel.y - ctr.y) - sh.y, 0.0);
      float topZone = 1.0 - smoothstep(innerTop, innerTop + k, pixel.y);
      float botZone = smoothstep(innerBot - k, innerBot, pixel.y);
      float leftZone = 1.0 - smoothstep(innerLeft, innerLeft + k, pixel.x);
      float rightZone = smoothstep(innerRight - k, innerRight, pixel.x);
      float s = k * 2.0;
      float sink = max(
        max(topPen * smoothstep(s, 0.0, hLat) * topZone, botPen * smoothstep(s, 0.0, hLat) * botZone),
        max(leftPen * smoothstep(s, 0.0, vLat) * leftZone, rightPen * smoothstep(s, 0.0, vLat) * rightZone));
      sinkValue = max(sinkValue, sink);
    }
    dInner -= sinkValue;
    float minThick = min(min(innerTop - outerTop, outerBot - innerBot), min(innerLeft - outerLeft, outerRight - innerRight));
    float kFrame = clamp(min(k, minThick - 1.0), 1.0, k);
    float dFrame = smaxSharpA(dOuter, -dInner, kFrame);
    merged = smin(merged, dFrame, k);
  }

  float fw = max(fwidth(merged), 0.0001);
  float alpha = 1.0 - smoothstep(-fw, fw, merged);
  fragColor = vec4(color.rgb * color.a * alpha, color.a * alpha);
}`;

export function createBlobRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ["res", "dpr", "smoothing", "holeRadius", "hole", "color", "rects", "radii", "deforms"].forEach(
    (n) => (U[n] = gl.getUniformLocation(prog, n))
  );
  const rectsA = new Float32Array(40);
  const radiiA = new Float32Array(40);
  const defA = new Float32Array(40);

  return {
    /* w, h: logical size; scale: backing-store pixels per logical px */
    draw({ w, h, scale, smoothing, holeRadius, hole, color, rects, radii, deforms }) {
      const bw = Math.max(1, Math.round(w * scale));
      const bh = Math.max(1, Math.round(h * scale));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);
      rectsA.fill(0);
      radiiA.fill(0);
      defA.fill(0);
      for (let i = 0; i < 10; i++) {
        const r = rects[i];
        if (!r) continue;
        rectsA.set(r, i * 4);
        radiiA.set(radii[i] || [0, 0, 0, 0], i * 4);
        const m = deforms[i];
        if (m) defA.set([m[0], m[1], m[2], 0], i * 4);
      }
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.dpr, scale);
      gl.uniform1f(U.smoothing, smoothing);
      gl.uniform1f(U.holeRadius, holeRadius);
      gl.uniform4fv(U.hole, hole);
      gl.uniform4fv(U.color, color);
      gl.uniform4fv(U.rects, rectsA);
      gl.uniform4fv(U.radii, radiiA);
      gl.uniform4fv(U.deforms, defA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

/* ---- BlobFill.js: per-corner radii [tr, br, bl, tl] ---- */
const MIN_R = 2;
const ss = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
function sdBox(px, py, x, y, w, h) {
  const dx = Math.abs(px - (x + w / 2)) - w / 2;
  const dy = Math.abs(py - (y + h / 2)) - h / 2;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}
const present = (r) => !!r && r[2] > 0.5 && r[3] > 0.5;

export function blobRadii(rects, radius, hole, k) {
  return rects.map((r, i) => {
    if (!present(r)) return [0, 0, 0, 0];
    const maxR = Math.min(r[2], r[3]) / 2;
    const own = Math.min(radius, maxR);
    const cx = [r[0] + r[2], r[0] + r[2], r[0], r[0]];
    const cy = [r[1], r[1] + r[3], r[1] + r[3], r[1]];
    const f = [1, 1, 1, 1];
    rects.forEach((o, j) => {
      if (j === i || !present(o)) return;
      for (let c = 0; c < 4; c++) {
        const sd = sdBox(cx[c], cy[c], o[0], o[1], o[2], o[3]);
        f[c] = Math.min(f[c], Math.max(ss(0, k, sd), ss(0, -k, sd)));
      }
    });
    if (hole) for (let c = 0; c < 4; c++) f[c] = Math.min(f[c], ss(0, k, -sdBox(cx[c], cy[c], ...hole)));
    return f.map((fc) => Math.max(own * fc, MIN_R));
  });
}

/* ---- BlobDeform.qml: underdamped spring stretching a rect along its velocity ---- */
export class BlobDeform {
  constructor(amount = 0.15, stiffness = 200, damping = 16) {
    this.scale = amount / 10000; // deformAmount * deformScale(1.0) / 10000
    this.k = stiffness;
    this.c = damping;
    this.m = [1, 0, 1];
    this.v = [0, 0, 0];
    this.prev = null;
  }
  step(cx, cy, dt) {
    if (!this.prev || dt > 0.1 || dt < 0.001) {
      this.prev = [cx, cy];
      return this.m;
    }
    const vx = (cx - this.prev[0]) / dt;
    const vy = (cy - this.prev[1]) / dt;
    this.prev = [cx, cy];
    const speed = Math.hypot(vx, vy);
    let t = [1, 0, 1];
    if (speed > 5) {
      const stretch = 1 + Math.min(speed * this.scale, 0.35);
      const comp = 1 / stretch;
      const c = vx / speed;
      const s = vy / speed;
      t = [stretch * c * c + comp * s * s, (stretch - comp) * c * s, stretch * s * s + comp * c * c];
    }
    const inv = 1 / (1 + this.c * dt);
    for (let i = 0; i < 3; i++) {
      this.v[i] = (this.v[i] - this.k * (this.m[i] - t[i]) * dt) * inv;
      this.m[i] += this.v[i] * dt;
    }
    const faint =
      Math.abs(this.m[0] - 1) + Math.abs(this.m[1]) + Math.abs(this.m[2] - 1) < 0.004 &&
      Math.abs(this.v[0]) + Math.abs(this.v[1]) + Math.abs(this.v[2]) < 0.05 &&
      speed < 5;
    if (faint) {
      this.m = [1, 0, 1];
      this.v = [0, 0, 0];
    }
    return this.m;
  }
  css() {
    const [a, b, d] = this.m;
    return `matrix(${a},${b},${b},${d},0,0)`;
  }
}

export const hexToVec4 = (hex, a = 1) => {
  // mid-tween, GSAP writes colour variables as rgba(), not hex
  const rgb = hex.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b, al = 1] = rgb[1].split(",").map(Number);
    return [r / 255, g / 255, b / 255, al * a];
  }
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};
