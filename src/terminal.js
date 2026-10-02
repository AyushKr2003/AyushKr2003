import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollToId } from "./main.js";

/*
  A small fake fish shell. It isn't a gimmick: it's the fastest way
  through the content for anyone who'd rather type, and it's honestly
  where I spend my day.
*/
const LOGO = String.raw`        .o.
       .888.
      .8"888.
     .8' ${"`"}888.
    .88ooo8888.
   .8'     ${"`"}888.
  o88o     o8888o`;

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const row = (k, v) => `<span class="c">${k.padEnd(10)}</span> ${v}`;

function neofetch() {
  const repos = document.querySelector("[data-repos]")?.textContent || "38";
  const stars = document.querySelector("[data-total-stars]")?.textContent || "230+";
  const info = [
    `<span class="b">ayush</span>@<span class="b">stack</span>`,
    `<span class="m">───────────</span>`,
    row("role", "software engineer"),
    row("now", "backend developer @ fillip technology"),
    row("host", "patna, india (IST, UTC+5:30)"),
    row("shell", "fish"),
    row("wm", "niri · hyprland (omarchy)"),
    row("langs", "c · c++ · java · python · dart · php · sql"),
    row("stack", "flutter · fastapi · laravel · rest · websockets"),
    row("data", "postgresql · mysql · sqlite"),
    row("github", `${repos} repos · ${stars} stars`),
    row("edu", "b.e. cse, chandigarh university '26"),
    "",
    `<span style="color:#0e0e0c">███</span><span style="color:#ff4a1c">███</span><span style="color:#ece8df">███</span><span style="color:#8b877d">███</span>`,
  ].join("\n");
  return `<div class="neo"><pre>${esc(LOGO)}</pre><div>${info}</div></div>`;
}

const COMMANDS = {
  help: () =>
    [
      `<span class="b">available commands</span>`,
      row("neofetch", "system info, but it's me"),
      row("whoami", "the short version"),
      row("projects", "selected work"),
      row("skills", "what i build with"),
      row("work", "experience"),
      row("contact", "ways to reach me"),
      row("resume", "open resume.pdf"),
      row("goto", "jump to a section: goto windows"),
      row("clear", "clear the screen"),
      `<span class="m">tab completes · ↑ ↓ history</span>`,
    ].join("\n"),
  neofetch,
  whoami: () =>
    "Ayush Kumar Singh. A software engineer who works across the stack: Flutter on the surface, Laravel and FastAPI in the middle, Linux underneath. I also write the desktop shell I use every day.",
  projects: () =>
    [
      row("sagesearch", "ai search + synthesis · flutter, fastapi, gemini"),
      row("niri-cs", "desktop shell for niri · qml · 171★"),
      row("nexvote", "blockchain voting · flutter, solidity"),
      row("musixir", "music streaming · flutter, fastapi"),
      row("journeylog", "travel blog · laravel, sqlite"),
      row("omacale", "omarchy shell plugin · qml"),
      `<span class="m">→ goto windows   to see them properly</span>`,
    ].join("\n"),
  skills: () =>
    [
      row("languages", "c, c++, java, python, dart, php, sql"),
      row("frameworks", "flutter, fastapi, laravel"),
      row("patterns", "rest, mvvm, fdd, auth, unit testing"),
      row("databases", "postgresql, mysql, sqlite"),
      row("tools", "git, linux, shell, websockets, postman, solidity"),
    ].join("\n"),
  work: () =>
    [
      row("2026 →", "backend developer · fillip technology"),
      row("2024–25", "flutter developer intern · medoc"),
      row("2022–26", "b.e. cse · chandigarh university · 7.9 cgpa"),
    ].join("\n"),
  contact: () =>
    [
      row("email", `<a href="mailto:ayushkrsngh2003@gmail.com">ayushkrsngh2003@gmail.com</a>`),
      row("github", `<a href="https://github.com/AyushKr2003" target="_blank" rel="noopener">github.com/AyushKr2003</a>`),
      row(
        "linkedin",
        `<a href="https://www.linkedin.com/in/ayush-kumar-singh-8b6b00249" target="_blank" rel="noopener">in/ayush-kumar-singh</a>`
      ),
      row("codolio", `<a href="https://codolio.com/profile/shadowMonarch" target="_blank" rel="noopener">shadowMonarch</a>`),
    ].join("\n"),
  resume: () => {
    open("/Ayush_Kumar_Singh_Resume.pdf", "_blank", "noopener");
    return "opening resume.pdf ↗";
  },
  ls: () => "about.txt  projects/  resume.pdf  .config/",
  "cat about.txt": () => COMMANDS.whoami(),
  pwd: () => "/home/ayush",
  date: () => new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
  echo: (args) => esc(args),
  "sudo hire-me": () =>
    `<span class="c">[sudo]</span> password for recruiter: ········\naccess granted. run <span class="b">contact</span>, i reply fast.`,
  sudo: () => `nice try. try <span class="b">sudo hire-me</span>`,
  exit: () => "there is no exit. only the contact section. (goto contact)",
  vim: () => "you'll never leave. try <span class=\"b\">exit</span> instead.",
  rm: () => "permission denied: this portfolio is load-bearing",
};

export function initTerminal(ctx) {
  const body = document.querySelector("[data-term-body]");
  const out = document.querySelector("[data-term-out]");
  const input = document.querySelector("[data-term-input]");
  // the terminal scrolls on its own, but only once it has overflowed.
  // Until then, the wheel keeps moving the page so it can't trap you.
  const syncPrevent = () => body.toggleAttribute("data-lenis-prevent", body.scrollHeight > body.clientHeight + 1);
  new ResizeObserver(syncPrevent).observe(out);

  const history = [];
  let hi = 0;

  function print(html) {
    out.insertAdjacentHTML("beforeend", html + "\n");
    body.scrollTop = body.scrollHeight;
    syncPrevent();
  }
  function echoCmd(cmd) {
    print(`<span class="m">ayush@stack ~ ❯</span> ${esc(cmd)}`);
  }

  function run(raw) {
    const cmd = raw.trim();
    echoCmd(cmd);
    if (!cmd) return;
    history.push(cmd);
    hi = history.length;
    const lower = cmd.toLowerCase();
    if (lower === "clear") {
      out.innerHTML = "";
      syncPrevent();
      return;
    }
    if (lower.startsWith("goto ")) {
      const id = lower.slice(5).trim();
      if (document.getElementById(id)?.matches("main > section")) {
        print(`→ ${id}`);
        scrollToId(`#${id}`);
      } else print(`goto: no such workspace: ${esc(id)}\n<span class="m">surface layers windows signal history shell contact</span>`);
      return;
    }
    const [head, ...rest] = lower.split(/\s+/);
    const fn = COMMANDS[lower] || COMMANDS[head];
    if (fn) print(fn(cmd.slice(head.length).trim(), rest));
    else print(`fish: Unknown command: <span class="c">${esc(head)}</span>  <span class="m">(try help)</span>`);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      run(input.value);
      input.value = "";
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hi = Math.max(0, hi - 1);
      input.value = history[hi] ?? "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hi = Math.min(history.length, hi + 1);
      input.value = history[hi] ?? "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      const v = input.value.toLowerCase();
      const all = [...Object.keys(COMMANDS), "clear", "goto"];
      const m = all.filter((k) => k.startsWith(v));
      if (m.length === 1) input.value = m[0];
      else if (m.length > 1) {
        echoCmd(input.value);
        print(`<span class="m">${m.join("  ")}</span>`);
      }
    }
  });
  body.addEventListener("click", () => {
    if (!getSelection()?.toString()) input.focus({ preventScroll: true });
  });

  // first visit: type `neofetch` by itself
  let booted = false;
  ScrollTrigger.create({
    trigger: body,
    start: "top 75%",
    once: true,
    onEnter: () => {
      if (booted) return;
      booted = true;
      if (ctx.reduced) return run("neofetch");
      const text = "neofetch";
      let i = 0;
      const t = setInterval(() => {
        input.value = text.slice(0, ++i);
        if (i === text.length) {
          clearInterval(t);
          setTimeout(() => {
            input.value = "";
            run(text);
            print(`<span class="m">type <span class="b">help</span> to look around</span>`);
          }, 260);
        }
      }, 70);
    },
  });
}
