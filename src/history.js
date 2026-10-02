import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
  Career as `git log --graph`: newest at the top, two lanes. main is
  school and personal work, side lanes are jobs that branch off and
  merge back. The graph draws itself behind a playhead fixed at 62% of
  the viewport, so the history plays back as you read it.
*/
const NS = "http://www.w3.org/2000/svg";

export function initHistory(ctx) {
  const graph = document.querySelector("[data-graph]");
  const svg = graph.querySelector("[data-graph-svg]");
  const items = [...graph.querySelectorAll(".graph__commits li")];

  let paths = [];
  let nodes = [];

  function build() {
    svg.innerHTML = "";
    const lane = parseFloat(getComputedStyle(graph).getPropertyValue("--lane")) || 34;
    const X = (l) => lane * (0.6 + l * 1.1);
    const ys = items.map((li) => li.offsetTop + 38);
    const lanes = items.map((li) => +li.dataset.lane);
    svg.setAttribute("height", graph.offsetHeight);

    const segs = [];
    // main lane: first lane-0 commit to the root
    const first0 = lanes.indexOf(0);
    segs.push({ d: `M${X(0)} ${ys[first0]} V${ys[ys.length - 1]}`, y0: ys[first0], y1: ys[ys.length - 1], branch: false });

    // each run of lane-1 commits becomes a branch that forks off (and maybe merges back into) main
    for (let i = 0; i < items.length; i++) {
      if (lanes[i] !== 1 || lanes[i - 1] === 1) continue;
      let j = i;
      while (lanes[j + 1] === 1) j++;
      let d = "";
      let y0 = ys[i];
      const mergeAbove = i > 0 && items[i - 1].hasAttribute("data-merge");
      if (mergeAbove) {
        y0 = ys[i - 1];
        d += `M${X(0)} ${ys[i - 1]} C${X(0)} ${ys[i - 1] + 40}, ${X(1)} ${ys[i] - 50}, ${X(1)} ${ys[i]}`;
      } else {
        d += `M${X(1)} ${ys[i]}`;
      }
      d += ` V${ys[j]}`;
      const yb = ys[j + 1];
      d += ` C${X(1)} ${ys[j] + 50}, ${X(0)} ${yb - 40}, ${X(0)} ${yb}`;
      segs.push({ d, y0, y1: yb, branch: true });
    }

    paths = segs.map((s) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", s.d);
      if (s.branch) p.classList.add("is-branch");
      svg.appendChild(p);
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = ctx.reduced ? 0 : `${len}`;
      return { el: p, len, y0: s.y0, y1: s.y1 };
    });

    nodes = items.map((li, i) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", X(lanes[i]));
      c.setAttribute("cy", ys[i]);
      c.setAttribute("r", li.hasAttribute("data-head") ? 7 : 5.5);
      if (lanes[i] === 1) c.classList.add("is-branch");
      if (li.hasAttribute("data-head")) c.classList.add("is-head");
      svg.appendChild(c);
      c.style.transformOrigin = `${X(lanes[i])}px ${ys[i]}px`;
      c.style.transform = ctx.reduced ? "" : "scale(0)";
      c.style.transition = "transform .5s cubic-bezier(.34,1.8,.5,1)";
      return { el: c, y: ys[i], li };
    });
  }

  function play(playY) {
    for (const p of paths) {
      const t = Math.max(0, Math.min(1, (playY - p.y0) / (p.y1 - p.y0)));
      p.el.style.strokeDashoffset = `${p.len * (1 - t)}`;
    }
    for (const n of nodes) {
      const on = playY >= n.y - 4;
      n.el.style.transform = on ? "scale(1)" : "scale(0)";
      n.li.classList.toggle("is-on", on);
    }
  }

  build();
  if (ctx.reduced) return;

  ScrollTrigger.create({
    trigger: graph,
    start: "top 62%",
    end: "bottom 62%",
    onUpdate: (self) => play(self.progress * graph.offsetHeight),
    onRefresh: (self) => {
      build();
      play(self.progress * graph.offsetHeight);
    },
  });

  // commits fade up as the playhead reaches them
  items.forEach((li) => {
    gsap.fromTo(li, { opacity: 0.18 }, {
      opacity: 1,
      ease: "none",
      scrollTrigger: { trigger: li, start: "top 72%", end: "top 55%", scrub: true },
    });
    gsap.from(li.querySelector("h3"), {
      x: 24,
      ease: "none",
      scrollTrigger: { trigger: li, start: "top 90%", end: "top 62%", scrub: true },
    });
  });
}
