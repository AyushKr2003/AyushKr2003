import { gsap, $, $$, mi, pointerTo, cursorHTML } from "./core.js";

/*
  NexVote, rebuilt from lib/: consts/conts.dart (blue[100] backdrop,
  blueAccent panels), nav_screen.dart (CollapsibleSidebar, 70px),
  welcome_page.dart, pages/vote_page.dart (search + green[50] election
  cards + the candidates AlertDialog) and pages/home_page.dart (user info,
  Vote History, Election History). All text is Open Sans, as in the app.
  Votes go through castVote(electionId, candidateIndex) via web3dart to
  a local Hardhat node. The small mono strip is an annotation, not app UI.
*/
const ELECTIONS = [
  ["Student Council 2024", "Choose the president of the CSE student council.", "2024-11-04", "09:00", "2024-11-08", "17:00"],
  ["Tech Fest Theme", "Vote for the theme of this year's tech fest.", "2024-11-02", "10:00", "2024-11-12", "18:00"],
  ["Library Hours", "Should the central library open 24 hours during exams?", "2024-10-28", "08:00", "2024-11-06", "20:00"],
];
const CANDIDATES = [
  ["Aarav Mehta", "AM"],
  ["Diya Raman", "DR"],
  ["Kabir Joshi", "KJ"],
];

export default {
  id: "nexvote",
  w: 1180,
  h: 640,
  still: 0.86,
  build(stage) {
    stage.innerHTML = `
      <section class="nv-welcome" data-welcome>
        <img src="/work/nexvote-bg.webp" alt="" />
        <div class="nv-welcome__in">
          ${mi("check_circle", "nv-logo")}
          <h1>Welcome to NexVote!</h1>
          <p>NexVote is a cutting-edge blockchain-based voting system ensuring secure and transparent elections. Explore your voting history, create proposals, and manage your votes with confidence.</p>
          <button data-start>Get Started</button>
          <small>Powered by Blockchain Technology</small>
        </div>
      </section>

      <section class="nv-app" data-nvapp>
        <nav class="nv-side">
          <span class="nv-av">${mi("person", "fill")}</span>
          <a data-nav0>${mi("home", "fill")}</a>
          <a>${mi("history_edu")}</a>
          <a data-nav2>${mi("how_to_vote", "fill")}</a>
        </nav>

        <div class="nv-page nv-vote" data-vote>
          <header class="nv-appbar">Votes</header>
          <h3>Search Elections</h3>
          <label class="nv-field">${mi("search")}<span>Search by Title</span></label>
          <div class="nv-list">
            ${ELECTIONS.map(([t, d, sd, st, ed, et], i) => `
              <article class="nv-ecard" ${i === 0 ? "data-pick" : ""}>
                <b>${t}</b><p>${d}</p>
                <div class="nv-dates"><span>Start Date: ${sd}  </span><span>Time: ${st}</span></div>
                <div class="nv-dates"><span>End Date: ${ed} </span><span>Time: ${et}</span></div>
              </article>`).join("")}
          </div>
        </div>

        <div class="nv-page nv-home" data-home>
          <div class="nv-panel nv-user">
            <div class="nv-white">
              <div class="nv-kv"><b>UserName: </b>Ayush Kumar Singh</div>
              <div class="nv-kv"><b>Email: </b>ayush@nexvote.dev</div>
              <div class="nv-kv"><b>Wallet Address: </b><span class="nv-addr">0x8f3C…2a9D</span>${mi("content_copy", "nv-copy")}</div>
              ${mi("person_2", "fill nv-bigav")}
            </div>
          </div>
          <div class="nv-row">
            <div class="nv-panel"><div class="nv-white nv-hist">
              <h4>Vote History</h4>
              <div class="nv-item nv-new" data-newvote><b>Student Council 2024 ${mi("check_circle", "fill nv-dot")}</b><small>Date: 2024-11-05 14:32</small><small>Candidate: Diya Raman</small><small class="tx">Transaction Hash: 0x354yhgf3…c81e</small></div>
              <div class="nv-item"><b>Tech Fest Theme ${mi("check_circle", "fill nv-dot")}</b><small>Date: 2024-11-03 11:08</small><small>Candidate: Retro Futurism</small><small class="tx">Transaction Hash: 0x9be1d4a0…77f2</small></div>
            </div></div>
            <div class="nv-panel"><div class="nv-white nv-hist">
              <h4>Election History</h4>
              <div class="nv-item"><b>Library Hours <i class="g"></i></b><small>Description: Should the central library open 24 hours during exams?</small><small>Start Date: 2024-10-28 08:00</small><small>End Date: 2024-11-06 20:00</small><small>Creator: Ayush Kumar Singh</small></div>
              <div class="nv-item"><b>Hackathon Track <i class="r"></i></b><small>Description: Pick the open-innovation track.</small><small>Start Date: 2024-09-12 09:00</small><small>End Date: 2024-09-15 21:00</small></div>
            </div></div>
          </div>
        </div>

        <div class="nv-scrim" data-scrim></div>
        <div class="nv-dialog" data-dialog>
          <h2>Student Council 2024</h2>
          <div class="nv-rows"><span><b>Start Date:</b> 2024-11-04    </span><span><b>Time:</b> 09:00</span></div>
          <div class="nv-rows"><span><b>End Date:</b> 2024-11-08</span><span><b>    Time:</b> 17:00</span></div>
          <p><b>Description:</b> Choose the president of the CSE student council.</p>
          <h5>Candidates:</h5>
          ${CANDIDATES.map(([n, s], i) => `<div class="nv-cand"><span>${n} (${s})</span><button ${i === 1 ? "data-votebtn" : ""}>Vote</button></div>`).join("")}
          <a class="nv-close">Close</a>
        </div>

        <div class="nv-tx mono-note" data-sign>
          <span>castVote(0, 1)</span><span>→ web3dart · Hardhat node 127.0.0.1:8545</span><span data-txh>tx 0x354yhgf3…c81e · mined</span>
        </div>
        <div class="nv-toast" data-toast>Vote Successfully</div>
      </section>
      ${cursorHTML}`;

    const welcome = $(stage, "[data-welcome]");
    const app = $(stage, "[data-nvapp]");
    const vote = $(stage, "[data-vote]");
    const home = $(stage, "[data-home]");
    const scrim = $(stage, "[data-scrim]");
    const dialog = $(stage, "[data-dialog]");
    const sign = $(stage, "[data-sign]");
    const toast = $(stage, "[data-toast]");
    const cursor = $(stage, ".app-cursor");
    const nav0 = $(stage, "[data-nav0]");
    const nav2 = $(stage, "[data-nav2]");
    const newVote = $(stage, "[data-newvote]");

    const navOn = (a) => $$(stage, ".nv-side a").forEach((x) => x.classList.toggle("on", x === a));

    const tl = gsap.timeline({ repeat: -1 });
    tl.set(welcome, { autoAlpha: 1 }, 0).set(app, { autoAlpha: 0 }, 0);
    tl.set([scrim, dialog, sign, toast], { autoAlpha: 0 }, 0);
    tl.set(vote, { autoAlpha: 1, yPercent: 0 }, 0).set(home, { autoAlpha: 0, yPercent: 0 }, 0);
    tl.set(newVote, { autoAlpha: 0, height: 0 }, 0);
    tl.set(cursor, { autoAlpha: 1, x: 760, y: 600 }, 0);
    tl.call(() => navOn(nav2), null, 0.001);

    // welcome → app (pushReplacement)
    let t = pointerTo(tl, stage, cursor, $(stage, "[data-start]"), 0.8);
    tl.to(welcome, { autoAlpha: 0, duration: 0.35 }, t);
    tl.to(app, { autoAlpha: 1, duration: 0.35 }, t);

    // open an election
    t = pointerTo(tl, stage, cursor, $(stage, "[data-pick]"), t + 0.4);
    tl.to(scrim, { autoAlpha: 1, duration: 0.25 }, t);
    tl.fromTo(dialog, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(1.6)" }, t);

    // vote → castVote on the contract → toast
    t = pointerTo(tl, stage, cursor, $(stage, "[data-votebtn]"), t + 0.6);
    const vb = $(stage, "[data-votebtn]");
    tl.call(() => vb.classList.add("is-busy"), null, t);
    tl.fromTo(sign, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "expo.out" }, t);
    tl.call(() => vb.classList.remove("is-busy"), null, t + 1.4);
    tl.to([dialog, scrim], { autoAlpha: 0, duration: 0.3 }, t + 1.5);
    tl.fromTo(toast, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3 }, t + 1.7);
    tl.to(toast, { autoAlpha: 0, duration: 0.3 }, t + 3.4);
    tl.to(sign, { autoAlpha: 0, duration: 0.3 }, t + 3.4);
    t += 1.2;

    // Home: the vote shows up in history with its transaction hash
    t = pointerTo(tl, stage, cursor, nav0, t + 1.6);
    tl.call(() => navOn(nav0), null, t);
    tl.to(vote, { autoAlpha: 0, duration: 0.2 }, t);
    tl.fromTo(home, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, t + 0.1);
    tl.to(newVote, { autoAlpha: 1, height: "auto", duration: 0.5, ease: "expo.out" }, t + 0.7);
    tl.to(cursor, { autoAlpha: 0, duration: 0.3 }, t + 0.6);
    tl.to({}, { duration: 2.8 });
    tl.to(app, { autoAlpha: 0, duration: 0.4 });
    return tl;
  },
};
