import { gsap, $, $$, pointerTo, cursorHTML } from "./core.js";

/*
  NexVote, redesigned. The data and the flow are the app's own (lib/model,
  pages/vote_page.dart): an election with candidates and per-candidate
  vote counts, read from the contract; picking a candidate and voting calls
  castVote(electionIndex, candidateIndex) through MetaMask and web3dart on
  a local Hardhat node, and the backend stores the transaction hash in the
  voter's history.

  The idea it's built around: a ballot is a block. The ledger on the right
  is the chain itself, and the vote only counts on the left once its block
  is mined: the tally ticks up at the same moment the block links on.
*/
const CANDIDATES = [
  ["Aarav Mehta", "AM", "#e8e3d3", 41],
  ["Diya Raman", "DR", "#d9e4dc", 37],
  ["Kabir Joshi", "KJ", "#e3dde8", 22],
];
const BLOCKS = [
  [127, "0x9be1d4a0…77f2", "castVote(0, 0)", "18s"],
  [126, "0x41c09e7b…a3d0", "castVote(0, 2)", "51s"],
  [125, "0xd2f7c311…0b9e", "castVote(0, 1)", "1m"],
  [124, "0x7a0e55c2…e41c", "addCandidate(0, …)", "3m"],
];
const total = CANDIDATES.reduce((n, c) => n + c[3], 0);
const pct = (n, t = total) => Math.round((n / t) * 100);

const block = ([n, h, fn, ago], cls = "") => `
  <li class="nv-blk ${cls}">
    <span class="nv-blk__n">#${n}</span>
    <code>${h}</code>
    <em>${fn}</em>
    <time>${ago}</time>
  </li>`;

export default {
  id: "nexvote",
  w: 1180,
  h: 640,
  still: 0.86,
  build(stage) {
    stage.innerHTML = `
      <header class="nv-top">
        <div class="nv-brand"><i class="nv-mark"><b></b><b></b><b></b></i>NexVote</div>
        <nav><a class="on">Elections</a><a>My votes</a><a>Create</a></nav>
        <div class="nv-net"><i></i>Hardhat · 31337</div>
        <div class="nv-wallet"><span class="nv-jdent"></span>0x8f3C…2a9D</div>
      </header>

      <main class="nv-main">
        <section class="nv-el">
          <p class="nv-crumb">Elections <span>/</span> CSE Department</p>
          <div class="nv-head">
            <h1>Student Council 2024</h1>
            <span class="nv-open"><i></i>Voting open</span>
          </div>
          <p class="nv-sub">Choose the president of the CSE student council. Closes 8 Nov, 17:00 · election #0 on-chain</p>

          <div class="nv-cands">
            ${CANDIDATES.map(([name, ini, bg, votes], i) => `
              <article class="nv-cand" data-cand="${i}">
                <div class="nv-cand__top">
                  <span class="nv-av" style="--bg:${bg}">${ini}</span>
                  <span class="nv-radio"><i></i></span>
                </div>
                <h3>${name}</h3>
                <small>Candidate ${String(i + 1).padStart(2, "0")}</small>
                <div class="nv-tally"><b data-votes="${i}">${votes}</b><span>votes</span><em data-pct="${i}">${pct(votes)}%</em></div>
                <div class="nv-bar"><i data-bar="${i}" style="--p:${votes / total}"></i></div>
              </article>`).join("")}
          </div>

          <ol class="nv-steps" data-steps>
            <li><i>1</i><b>Choose</b><span>one candidate</span></li>
            <li><i>2</i><b>Sign</b><span>castVote in MetaMask</span></li>
            <li><i>3</i><b>Mined</b><span>counted on-chain</span></li>
          </ol>

          <div class="nv-act">
            <p data-hint><span>Your vote is a transaction.</span> It's signed in your wallet and counted once its block is mined.</p>
            <button class="nv-btn" data-cast disabled><span data-btnlbl>Select a candidate</span><i class="nv-spin"></i></button>
          </div>
        </section>

        <aside class="nv-ledger">
          <div class="nv-ledger__h">
            <b>Ledger</b>
            <code>NexVote · 0x5FbD…0aa3</code>
          </div>
          <ol class="nv-chain" data-chain>
            ${block([128, "0x354b9af3…c81e", "castVote(0, 1)", "now"], "is-new")}
            ${BLOCKS.map((b) => block(b)).join("")}
          </ol>
          <div class="nv-receipt" data-receipt>
            <p>Receipt <span>stored in your vote history</span></p>
            <dl>
              <div><dt>tx</dt><dd>0x354b9af3…c81e</dd></div>
              <div><dt>block</dt><dd>#128</dd></div>
              <div><dt>candidate</dt><dd>Diya Raman</dd></div>
            </dl>
          </div>
        </aside>
      </main>

      <div class="nv-sign" data-sign>
        <div class="nv-sign__h"><span>MetaMask</span><em>Hardhat Localhost</em></div>
        <p class="nv-sign__from">localhost:54217 wants you to confirm</p>
        <h4>castVote</h4>
        <dl>
          <div><dt>Contract</dt><dd>0x5FbD…0aa3</dd></div>
          <div><dt>electionIndex</dt><dd>0</dd></div>
          <div><dt>candidateIndex</dt><dd>1</dd></div>
          <div><dt>Network fee</dt><dd>0.00012 ETH</dd></div>
        </dl>
        <div class="nv-sign__b"><span>Reject</span><button data-confirm>Confirm</button></div>
      </div>
      ${cursorHTML}`;

    const cards = $$(stage, "[data-cand]");
    const cast = $(stage, "[data-cast]");
    const lbl = $(stage, "[data-btnlbl]");
    const sign = $(stage, "[data-sign]");
    const confirm = $(stage, "[data-confirm]");
    const chain = $(stage, "[data-chain]");
    const fresh = $(stage, ".nv-blk.is-new");
    const receipt = $(stage, "[data-receipt]");
    const cursor = $(stage, ".app-cursor");
    const votes = $(stage, '[data-votes="1"]');
    const bars = $$(stage, "[data-bar]");
    const pcts = $$(stage, "[data-pct]");
    const steps = $$(stage, "[data-steps] li");
    const step = (k) => steps.forEach((li, i) => li.classList.toggle("is-on", i < k));

    const state = (txt, cls = "") => {
      lbl.textContent = txt;
      cast.className = `nv-btn ${cls}`;
    };
    const setTally = (n) => {
      const counts = CANDIDATES.map((c, i) => (i === 1 ? n : c[3]));
      const t = counts.reduce((a, b) => a + b, 0);
      votes.textContent = n;
      counts.forEach((c, i) => {
        pcts[i].textContent = `${pct(c, t)}%`;
        bars[i].style.setProperty("--p", c / t);
      });
    };

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => {
      cards.forEach((c) => c.classList.remove("is-on"));
      state("Select a candidate");
      cast.disabled = true;
      setTally(37);
      step(0);
    }, null, 0.001);
    tl.set([sign, receipt], { autoAlpha: 0 }, 0);
    tl.set(fresh, { autoAlpha: 0, height: 0, marginBottom: 0 }, 0);
    tl.set(cursor, { autoAlpha: 1, x: 640, y: 600 }, 0);
    // the tallies arrive from the contract
    tl.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "expo.out", stagger: 0.08 }, 0.15);

    // 1 · pick a candidate
    let t = pointerTo(tl, stage, cursor, cards[1], 0.9);
    tl.call(() => {
      cards.forEach((c, i) => c.classList.toggle("is-on", i === 1));
      state("Cast vote for Diya Raman", "is-ready");
      step(1);
      cast.disabled = false;
    }, null, t - 0.3);

    // 2 · cast → the wallet asks for a signature
    t = pointerTo(tl, stage, cursor, cast, t + 0.5);
    tl.call(() => state("Waiting for signature", "is-wait"), null, t - 0.2);
    tl.fromTo(sign, { autoAlpha: 0, y: -16, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "expo.out" }, t);

    // 3 · confirm → pending → the block is mined and linked onto the chain
    t = pointerTo(tl, stage, cursor, confirm, t + 0.7);
    tl.to(sign, { autoAlpha: 0, y: -10, duration: 0.25, ease: "power2.in" }, t);
    tl.call(() => (state("Pending · mining block #128", "is-wait"), step(2)), null, t);
    tl.to(cursor, { autoAlpha: 0, duration: 0.3 }, t + 0.2);
    t += 1.3;
    tl.to(fresh, { autoAlpha: 1, height: "auto", marginBottom: 8, duration: 0.6, ease: "expo.out" }, t);
    tl.fromTo(chain, { "--link": 0 }, { "--link": 1, duration: 0.5, ease: "power2.out" }, t + 0.2);
    // the count only moves once the block exists
    const n = { v: 37 };
    tl.to(n, { v: 38, duration: 0.5, ease: "none", onUpdate: () => setTally(Math.round(n.v)) }, t + 0.35);
    tl.fromTo(votes, { y: 10, autoAlpha: 0.2 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(2)", immediateRender: false }, t + 0.5);
    tl.call(() => (state("Vote recorded · block #128", "is-done"), step(3)), null, t + 0.4);
    tl.fromTo(receipt, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" }, t + 0.9);
    tl.to({}, { duration: 3.2 });
    tl.to([receipt, fresh], { autoAlpha: 0, duration: 0.4 });
    return tl;
  },
};
