# ayush@stack: the portfolio

Portfolio of Ayush Kumar Singh. The page is a descent through the stack, from the pixels down to the shell. Each section gets its own motion idea, and that idea comes from the thing the section is about.

| # | Section  | Motion idea |
|---|----------|-------------|
| 1 | Surface  | The name is set in a variable font (Anybody, wdth 50–150). Each line fits itself edge to edge. A cursor lens widens nearby letters while the rest of the line gives that width back. Scrolling compresses the name to the narrowest width. |
| 2 | Layers   | Four planes start stacked flat, so they look like one app. Scrolling tilts them into an axonometric view and explodes them, then a packet drops through UI → API → data → system. |
| 3 | Work     | Each project runs live on the platform it was built for. **Linux**: two outputs, the shell on DP-1 and kitty on a rotated DP-2. Going from niri to Hyprland is a session switch through a TTY. omacale is rebuilt from the plugin running on my laptop: its Catppuccin scheme, wallpaper, desktop clock and cava bars. fish keeps one session the whole way: fastfetch and real `git log` per repo. **Flutter**: one device that changes shape. Musixir and CognitoAI run on a phone (switching apps goes through Android's recents), the song colour lights the room, then the scroll turns the phone sideways and grows it into a browser window for the Flutter web apps. |
| 4 | Signal   | One particle per stargazer of niri-caelestia-shell (counted live from GitHub). They assemble into their own count, and the cursor pushes them apart. |
| 5 | History  | Career as `git log --graph`. Jobs branch off main and merge back, drawn behind a scroll playhead. |
| 6 | Shell    | A working fake fish shell: `neofetch`, `help`, `projects`, `goto <section>`, tab completion, history. |
| 7 | Contact  | The email starts fully condensed and widens with the scroll until it spans the page. Click to copy. |

Global systems: Lenis smooth scroll; a status-bar nav where sections are workspaces; a palette that re-tweens per section (paper → ink → signal); headings that condense under scroll velocity; full `prefers-reduced-motion` support.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

`dist/` is plain static files, so you can deploy it to Netlify, Vercel, Cloudflare Pages or GitHub Pages as is.

## Editing content

All copy lives in `index.html`. Star, fork and repo counts are fetched live in `src/data.js`, and the markup keeps fallback values. Projects live in section 3. A Linux project is a `[data-pane]` on DP-1 plus a `[data-kt]` block of fish output in kitty, and a Flutter project is a `[data-layer]` in the device plus a `[data-item]` of copy. The scene logic is in `src/work.js`, and each live UI is a module in `src/apps/`.
