import gsap from "gsap";

/*
  The ending mirrors the opening. The email starts fully condensed
  (wdth 50) and widens with your scroll until it spans the page.
  Clicking copies it.
*/
export function initContact(ctx) {
  const section = document.querySelector(".contact");
  const btn = section.querySelector("[data-copy]");
  const text = section.querySelector("[data-mail]");
  const toast = section.querySelector("[data-toast]");

  // find the widest setting that still fits on screen
  function fitWidth() {
    const avail = section.clientWidth - parseFloat(getComputedStyle(section).paddingLeft) * 2;
    const prev = text.style.getPropertyValue("--mw");
    let lo = 50;
    let hi = 150;
    text.style.width = "max-content";
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      text.style.setProperty("--mw", mid);
      if (text.getBoundingClientRect().width > avail) hi = mid;
      else lo = mid;
    }
    text.style.width = "";
    text.style.setProperty("--mw", prev || 50);
    return lo;
  }

  if (ctx.reduced) {
    text.style.setProperty("--mw", fitWidth());
  } else {
    const st = { w: 50 };
    gsap.to(st, {
      w: () => fitWidth(),
      ease: "power2.out",
      onUpdate: () => text.style.setProperty("--mw", st.w.toFixed(2)),
      scrollTrigger: {
        trigger: section,
        start: "top 85%",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    gsap.from(".contact__title", {
      yPercent: 40,
      autoAlpha: 0,
      duration: 1.1,
      ease: "expo.out",
      scrollTrigger: { trigger: section, start: "top 60%", once: true },
    });
  }

  let timer;
  btn.addEventListener("click", async () => {
    const addr = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(addr);
      toast.textContent = "copied to clipboard. talk soon.";
    } catch {
      location.href = `mailto:${addr}`;
      toast.textContent = "opening your mail client…";
    }
    clearTimeout(timer);
    timer = setTimeout(() => (toast.textContent = ""), 2600);
    if (!ctx.reduced) gsap.fromTo(text, { scale: 0.985 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, .4)" });
  });
}
