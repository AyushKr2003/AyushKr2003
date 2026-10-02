import gsap from "gsap";

/*
  Shared plumbing for the live project UIs in the Windows section.

  Each app is authored at a fixed "device" resolution (the stage) and
  scaled to fit its window, like a screenshot that is still running.
  Timelines only play while their window is on screen.
*/

const ICONS_OUTLINED =
  "account_balance_wallet,add,add_circle,arrow_forward,auto_awesome,bookmark,chat_bubble,check_circle,chevron_left,close,content_copy,explore,favorite,history_edu,home,how_to_vote,keyboard_arrow_left,login,logout,menu,person,person_2,person_add,search,settings,source,tune";
const ICONS_ROUNDED =
  "apps,battery_full,bedtime,block,bluetooth,brightness_6,calendar_month,center_focus_strong,check,chevron_left,chevron_right,cloud,coffee,dark_mode,dashboard,desktop_windows,developer_board,do_not_disturb_on,download,expand_more,fit_screen,fullscreen,headphones,image,keyboard,list,logout,memory,mic,notifications,partly_cloudy_day,pause,person,photo_camera,play_arrow,power_settings_new,queue_music,refresh,screen_record,search,settings,skip_next,skip_previous,speed,storage,terminal,videocam,volume_up,wifi,workspaces";

// The fonts each project actually ships with, loaded only when the work section gets close.
const FONT_URLS = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Manrope:wght@700&family=Rubik:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&family=Google+Sans+Flex:wght@400..700&display=swap",
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&icon_names=${ICONS_OUTLINED}&display=block`,
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&icon_names=${ICONS_ROUNDED}&display=block`,
];

let fontsLoaded = false;
export function loadAppFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;
  FONT_URLS.forEach((href) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  });
}

/* tiny helpers shared by the app modules */
export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];
export const mi = (name, cls = "") => `<i class="mi ${cls}">${name}</i>`; // Flutter's Material icons
export const ms = (name, cls = "") => `<i class="ms ${cls}">${name}</i>`; // Caelestia's Material Symbols Rounded

/* type text into an element over `dur` seconds on a timeline */
export function typeOn(tl, el, text, at, dur, { caret = true } = {}) {
  const o = { n: 0 };
  tl.call(() => (el.textContent = ""), null, at);
  tl.to(
    o,
    {
      n: text.length,
      duration: dur,
      ease: "none",
      onStart: () => caret && el.classList.add("is-typing"),
      onUpdate: () => (el.textContent = text.slice(0, Math.round(o.n))),
      onComplete: () => el.classList.remove("is-typing"),
    },
    at
  );
  return at + dur;
}

/* reveal words one at a time — used for streamed AI answers */
export function streamWords(tl, el, at, dur) {
  const words = $$(el, ".w");
  const o = { n: 0 };
  tl.call(() => words.forEach((w) => (w.style.opacity = 0)), null, at - 0.001);
  tl.to(
    o,
    {
      n: words.length,
      duration: dur,
      ease: "none",
      onUpdate: () => {
        const k = Math.round(o.n);
        for (let i = 0; i < words.length; i++) words[i].style.opacity = i < k ? 1 : 0;
      },
    },
    at
  );
}
export const wrapWords = (html) =>
  html.replace(/(<[^>]+>)|([^<\s]+)/g, (m, tag, word) => (tag ? tag : `<span class="w">${word}</span>`));

/* fake pointer that glides to an element and presses it */
export function pointerTo(tl, stage, cursor, target, at, { press = true, dur = 0.7 } = {}) {
  tl.to(
    cursor,
    {
      duration: dur,
      ease: "power3.inOut",
      x: () => centre(stage, target).x,
      y: () => centre(stage, target).y,
    },
    at
  );
  if (press) {
    tl.to(cursor, { scale: 0.82, duration: 0.1, ease: "power2.in" }, at + dur);
    tl.to(cursor, { scale: 1, duration: 0.2, ease: "back.out(3)" }, at + dur + 0.1);
    tl.fromTo(target, { scale: 1 }, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut" }, at + dur);
  }
  return at + dur + (press ? 0.3 : 0);
}
function centre(stage, el) {
  // position in stage (unscaled) coordinates
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const k = s.width / stage.offsetWidth || 1;
  return { x: (r.left - s.left + r.width / 2) / k, y: (r.top - s.top + r.height / 2) / k };
}
export const cursorHTML = `<svg class="app-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8-6.2 1.6L10 19z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

/*
  Mount an app into a window's viz box:
  - builds a stage at the app's native size
  - scales it to fit (contain) and keeps it centred
  - plays the app's timeline only while the box is visible
*/
export function mountApp(viz, app, ctx) {
  const stage = document.createElement("div");
  stage.className = `stage app-${app.id}`;
  stage.style.width = `${app.w}px`;
  stage.style.height = `${app.h}px`;
  viz.appendChild(stage);
  const tl = app.build(stage, ctx);

  const fit = () => {
    const k = Math.min(viz.clientWidth / app.w, viz.clientHeight / app.h);
    stage.style.transform = `translate(${(viz.clientWidth - app.w * k) / 2}px, ${(viz.clientHeight - app.h * k) / 2}px) scale(${k})`;
  };
  new ResizeObserver(fit).observe(viz);
  fit();

  if (!tl) return;
  if (ctx.reduced) {
    tl.progress(app.still ?? 0.6).pause();
    return;
  }
  tl.pause();
  new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.25 }).observe(viz);
}

export { gsap };
