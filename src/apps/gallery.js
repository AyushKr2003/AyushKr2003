import gsap from "gsap";

/*
  "screens" opens the project's real screenshots: straight from its repo,
  or captured from the app running locally. Images load only on open.
*/
const SETS = {
  sage: [
    ["sage-homePage", "Home: ask anything"],
    ["sage-loadingPage", "Sources and answer loading (Skeletonizer)"],
    ["sage-resultPage", "Ranked sources and a Gemini answer with citations"],
  ],
  niri: [
    ["niri-dashboard", "Dashboard drawer"],
    ["niri-niriThings", "Niri tab: IPC controls for windows and workspaces"],
    ["niri-app_launcher", "Launcher"],
    ["niri-quicktoggles", "Quick toggles"],
    ["niri-weather", "Weather"],
    ["niri-clipboard", "Clipboard history"],
  ],
  musixir: [
    ["mx-home_screen", "Home: recently played and latest uploads"],
    ["mx-player_page", "Player, themed by the song's colour"],
    ["mx-background_play", "Background playback with media notification"],
    ["mx-search_screen", "Search"],
    ["mx-library_page", "Library"],
    ["mx-upload_page", "Upload: thumbnail, audio and colour picker"],
    ["mx-login_screen", "Sign in"],
    ["mx-splash_screen", "Splash"],
  ],
  journeylog: [
    ["jl-home", "Home: every story, by category"],
    ["jl-create", "New Blog (member)"],
    ["jl-blog", "Article List with delete"],
    ["jl-article", "Story page"],
  ],
  omacale: [
    ["omacale-preview", "Omacale: frame, dashboard, launcher, sidebar, OSD"],
    ["omarchy-overview", "omarchy-overview: workspace overview with live previews"],
  ],
};

export function initGallery(ctx) {
  const box = document.createElement("div");
  box.className = "gallery";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Screenshots");
  box.innerHTML = `
    <div class="gallery__top mono"><span data-g-count></span><span data-g-cap></span><button data-g-close aria-label="Close">close ✕</button></div>
    <div class="gallery__frame"><img data-g-img alt="" /></div>
    <div class="gallery__nav mono"><button data-g-prev aria-label="Previous">← prev</button><button data-g-next aria-label="Next">next →</button></div>`;
  document.body.appendChild(box);
  const img = box.querySelector("[data-g-img]");
  const cap = box.querySelector("[data-g-cap]");
  const count = box.querySelector("[data-g-count]");
  let set = [];
  let i = 0;
  let opener = null;

  function show(n) {
    i = (n + set.length) % set.length;
    const [file, label] = set[i];
    img.src = `/work/shots/${file}.webp`;
    img.alt = label;
    cap.textContent = label;
    count.textContent = `${String(i + 1).padStart(2, "0")} / ${String(set.length).padStart(2, "0")}`;
    if (!ctx.reduced) gsap.fromTo(img, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "expo.out" });
  }
  function open(id, from) {
    set = SETS[id] || [];
    if (!set.length) return;
    opener = from;
    box.classList.add("is-open");
    ctx.lenis?.stop();
    show(0);
    box.querySelector("[data-g-close]").focus();
  }
  function close() {
    box.classList.remove("is-open");
    ctx.lenis?.start();
    opener?.focus();
  }

  box.querySelector("[data-g-close]").addEventListener("click", close);
  box.querySelector("[data-g-prev]").addEventListener("click", () => show(i - 1));
  box.querySelector("[data-g-next]").addEventListener("click", () => show(i + 1));
  box.addEventListener("click", (e) => e.target === box && close());
  addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") show(i + 1), e.stopImmediatePropagation();
    if (e.key === "ArrowLeft") show(i - 1), e.stopImmediatePropagation();
  }, true);

  document.querySelectorAll("[data-gallery]").forEach((btn) => {
    const n = SETS[btn.dataset.gallery]?.length;
    if (!n) return btn.remove();
    btn.textContent = `screens (${n}) ⧉`;
    btn.addEventListener("click", () => open(btn.dataset.gallery, btn));
  });
}
