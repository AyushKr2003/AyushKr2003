# ayush@stack: portfolio

Personal portfolio of Ayush Kumar Singh (software engineer: Flutter, FastAPI/Laravel backends, Linux desktop shells). Vite + GSAP (ScrollTrigger) + Lenis, plain JS modules, no framework.

## The brief (read this before any design work)

### 1. Original brief: the whole site

> I want to completely redesign my portfolio around high-quality motion and interaction. Every scroll should feel fresh. Don't just copy existing portfolio patterns. Research how people are creating this kind of experience, then come up with something unique and premium. I don't want another generic AI-generated portfolio that looks like AI slop.

What this means in practice:
- **Motion is the medium, not decoration.** Each section has one motion idea, and that idea comes from the thing the section is about (see the table in `docs/portfolio.md`). A new section or redesign needs its own idea. Don't reuse fade-up-on-scroll.
- **Every scroll should feel fresh.** Neighbouring sections shouldn't share an interaction pattern.
- **Research before designing.** Look at how award-level studios and developers do this kind of experience, then do something original instead of copying a known template.
- **No AI slop.** That rules out generic gradient blobs, glassmorphism cards, "Hi, I'm X 👋" heroes, bento grids of buzzwords, emoji bullets, purple-to-blue gradients, stock icon rows and filler copy. The copy should be specific, factual and in Ayush's voice.
- **Premium means restraint.** Limited palette (paper / ink / signal orange `#ff4a1c`), two typefaces (Anybody variable + Martian Mono), precise spacing, real content, and details that reward a closer look.

### 2. Follow-up brief: the projects section ("Windows", section 03)

> Change my projects. The window style is good but I want something different and creative. The window is only for Linux, so it should have Linux-related things in it, and the mobile (Flutter) projects should be in a mobile. Design it like a premium designer. Do more research and then do it.

What this means in practice:
- **Each project gets the form factor it actually runs on.** Don't put every project in the same window chrome.
  - Linux desktop shells (niri-caelestia-shell, omacale) → the desktop / compositor / window treatment, with real Linux flavour (Wayland, niri, Hyprland, Omarchy, terminals, workspaces).
  - Flutter mobile apps (Musixir, CognitoAI) → a phone.
  - Web apps (SageSearch: Flutter web; NexVote: Flutter web) → a fitting browser or web form factor, not a Linux window.
- Keep the live, rebuilt app UIs in `src/apps/*.js`. They are the strongest part. Change what holds them.
- It still has to work on phones, with `prefers-reduced-motion`, and with keyboard input.

## Architecture

- `index.html`: all copy and section markup. Sections are `<section data-theme="paper|ink|signal">`, and the theme re-tweens globally in `src/main.js`.
- `src/main.js`: Lenis, themes, status bar (sections as workspaces), boot log, init order.
- One module per section: `hero.js`, `layers.js`, `work.js` (projects: the Linux desk scene and the Flutter device scene), `signal.js`, `history.js`, `terminal.js`, `contact.js`.
- `src/apps/`: live rebuilt project UIs. `core.js` provides `mountApp`: a fixed-size stage scaled to fit, with a timeline that plays only while visible. With `{ manual: true }` it also waits for `setActive`, which lets several apps share one screen. Apps report events upward: Musixir sends `tint`. `gallery.js` shows the screenshots, which live in `public/work/shots/`.
- `src/apps/caelestia/`: the Caelestia motion tokens, M3 shapes and the WebGL SDF blob.
- `src/data.js`: live GitHub stars, forks and repo counts, written into `[data-stars]`, `[data-forks]` and `[data-repos]`.
- Styles: `src/style.css` (page and sections), `src/apps.css` (app UIs, namespaced `.app-<id>`).

## Conventions

- Match the existing comment style: short block comments that explain *why* a piece of motion exists and where it comes from (e.g. "from dashboard/Background.qml").
- Every animation needs a `ctx.reduced` path.
- Facts in the copy have to be true. Don't invent metrics, users or features.
- Run `npm run dev` to work locally and `npm run build` to check the build. Use playwright-core (a dev dependency) for screenshots.
- Git: never add Claude as co-author or any AI attribution in commits or PRs.
