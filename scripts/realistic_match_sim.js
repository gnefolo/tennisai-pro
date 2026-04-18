// ═══════════════════════════════════════════════════════════════════════
// TennisAI Pro — Realistic Match Simulator v3
// ═══════════════════════════════════════════════════════════════════════
// Paste this entire script into the browser console on
// https://tennisai-pro-green.vercel.app/live
//
// KEY DESIGN: The script clicks the winner FIRST, then reads step 1's
// header ("Servizio del Player" / "Servizio dell'Opponent") to know
// who is ACTUALLY serving according to the UI, and generates tags
// that are guaranteed to match the UI's logical rules.
// ═══════════════════════════════════════════════════════════════════════

(async () => {
  "use strict";

  // ── CONFIG ──────────────────────────────────────────────────────────
  const P1_NAME = "J. Sinner";
  const P2_NAME = "D. Medvedev";
  const TOURNAMENT = "BNP Paribas Open";
  const SURFACE = "Clay";       // Hard | Clay | Grass | Other
  const FORMAT = "BO3";         // BO3 | BO5
  const FIRST_SVR = "me";       // "me" | "opponent"
  const ROUND = "F";
  const P1_HAND = "R";
  const P1_STYLE = "all_court";

  const TICK = 120;
  const POST_POINT = 2500;  // wait for backend response

  // ── PROBABILITIES ──────────────────────────────────────────────────
  const SURFACE_SVR_ADV = { Hard: 0.635, Clay: 0.58, Grass: 0.67, Other: 0.62 };
  const SVR_WIN_RATE = SURFACE_SVR_ADV[SURFACE] || 0.62;
  const FIRST_SERVE_IN_PCT = 0.62;
  const ACE_PROB = SURFACE === "Grass" ? 0.09 : SURFACE === "Clay" ? 0.03 : 0.06;
  const DF_PROB = 0.04;

  const PATTERN_WEIGHTS = [
    ["SERVE_DOMINANT", 25, 0],
    ["AGGRESSIVE_RETURN", 0, 18],
    ["SHORT_RALLY", 20, 20],
    ["MEDIUM_RALLY", 18, 22],
    ["LONG_RALLY", 12, 18],
    ["SHORT_BALL_ATTACK", 8, 8],
    ["NET_PLAY", 7, 4],
    ["DEFENSE_RECOVERY", 5, 6],
    ["PASSING_LOB", 5, 4],
  ];

  const SERVE_DIR_W = {
    Clay: { T: 35, BODY: 25, WIDE: 40 },
    Hard: { T: 40, BODY: 20, WIDE: 40 },
    Grass: { T: 45, BODY: 15, WIDE: 40 },
    Other: { T: 35, BODY: 25, WIDE: 40 },
  };
  const SERVE_QUALITY_1ST = { AGGRESSIVE: 40, SAFE: 45, WEAK: 15 };
  const SERVE_QUALITY_2ND = { AGGRESSIVE: 15, SAFE: 55, WEAK: 30 };
  const RETURN_TYPES_DEEP_RALLY = { DEEP: 35, CENTRAL: 25, ANGLED: 15, BLOCKED: 10, SHORT: 10, AGGRESSIVE: 5 };
  const RETURN_TYPES_AGG = { AGGRESSIVE: 40, DEEP: 25, ANGLED: 20, CENTRAL: 10, SHORT: 3, BLOCKED: 2 };

  const RALLY_PHASE_MAP = {
    SERVE_DOMINANT: { ATTACK_ME: 60, NEUTRAL: 30, ATTACK_OPP: 5, DEFENSE_ME: 3, DEFENSE_OPP: 2 },
    AGGRESSIVE_RETURN: { ATTACK_ME: 55, NEUTRAL: 25, ATTACK_OPP: 10, DEFENSE_ME: 5, DEFENSE_OPP: 5 },
    SHORT_RALLY: { ATTACK_ME: 35, NEUTRAL: 35, ATTACK_OPP: 15, DEFENSE_ME: 10, DEFENSE_OPP: 5 },
    MEDIUM_RALLY: { NEUTRAL: 40, ATTACK_ME: 20, ATTACK_OPP: 20, DEFENSE_ME: 10, DEFENSE_OPP: 10 },
    LONG_RALLY: { NEUTRAL: 35, DEFENSE_ME: 20, DEFENSE_OPP: 15, ATTACK_ME: 15, ATTACK_OPP: 15 },
    SHORT_BALL_ATTACK: { ATTACK_ME: 50, NEUTRAL: 20, ATTACK_OPP: 15, DEFENSE_ME: 10, DEFENSE_OPP: 5 },
    NET_PLAY: { ATTACK_ME: 55, NEUTRAL: 15, ATTACK_OPP: 15, DEFENSE_ME: 10, DEFENSE_OPP: 5 },
    DEFENSE_RECOVERY: { DEFENSE_ME: 40, NEUTRAL: 25, DEFENSE_OPP: 15, ATTACK_OPP: 10, ATTACK_ME: 10 },
    PASSING_LOB: { ATTACK_ME: 30, ATTACK_OPP: 30, NEUTRAL: 20, DEFENSE_ME: 10, DEFENSE_OPP: 10 },
  };
  const FINISH_TYPE_MAP = {
    SERVE_DOMINANT: { WINNER: 55, FORCED_ERROR: 30, UNFORCED_ERROR: 15 },
    AGGRESSIVE_RETURN: { WINNER: 40, FORCED_ERROR: 35, UNFORCED_ERROR: 25 },
    SHORT_RALLY: { WINNER: 35, FORCED_ERROR: 30, UNFORCED_ERROR: 35 },
    MEDIUM_RALLY: { WINNER: 25, FORCED_ERROR: 35, UNFORCED_ERROR: 40 },
    LONG_RALLY: { WINNER: 20, FORCED_ERROR: 30, UNFORCED_ERROR: 50 },
    SHORT_BALL_ATTACK: { WINNER: 45, FORCED_ERROR: 30, UNFORCED_ERROR: 25 },
    NET_PLAY: { WINNER: 50, FORCED_ERROR: 25, UNFORCED_ERROR: 25 },
    DEFENSE_RECOVERY: { WINNER: 15, FORCED_ERROR: 40, UNFORCED_ERROR: 45 },
    PASSING_LOB: { WINNER: 45, FORCED_ERROR: 30, UNFORCED_ERROR: 25 },
  };
  const FINISH_SHOT_MAP = {
    SERVE_DOMINANT: { SERVE: 50, FOREHAND: 30, BACKHAND: 20 },
    AGGRESSIVE_RETURN: { FOREHAND: 50, BACKHAND: 35, PASSING: 10, OTHER: 5 },
    SHORT_RALLY: { FOREHAND: 45, BACKHAND: 35, OTHER: 10, VOLLEY: 10 },
    MEDIUM_RALLY: { FOREHAND: 40, BACKHAND: 40, OTHER: 10, VOLLEY: 5, PASSING: 5 },
    LONG_RALLY: { FOREHAND: 35, BACKHAND: 40, PASSING: 10, OTHER: 10, VOLLEY: 5 },
    SHORT_BALL_ATTACK: { FOREHAND: 50, BACKHAND: 25, VOLLEY: 15, SMASH: 5, OTHER: 5 },
    NET_PLAY: { VOLLEY: 45, SMASH: 20, FOREHAND: 15, BACKHAND: 10, OTHER: 10 },
    DEFENSE_RECOVERY: { FOREHAND: 35, BACKHAND: 40, PASSING: 10, OTHER: 10, VOLLEY: 5 },
    PASSING_LOB: { PASSING: 40, FOREHAND: 25, BACKHAND: 20, OTHER: 10, VOLLEY: 5 },
  };
  const KEY_EVENT_MAP = {
    SERVE_DOMINANT: { NONE: 100 },
    AGGRESSIVE_RETURN: { NONE: 60, LINE_CHANGE: 15, INSIDE_OUT: 15, INSIDE_IN: 10 },
    SHORT_RALLY: { NONE: 55, DROP_SHOT: 15, NET_APPROACH: 10, LINE_CHANGE: 10, INSIDE_OUT: 5, INSIDE_IN: 5 },
    MEDIUM_RALLY: { NONE: 40, LINE_CHANGE: 15, INSIDE_OUT: 15, DROP_SHOT: 10, NET_APPROACH: 10, INSIDE_IN: 10 },
    LONG_RALLY: { NONE: 30, LINE_CHANGE: 15, INSIDE_OUT: 15, INSIDE_IN: 10, DROP_SHOT: 10, LOB: 10, PASSING: 5, NET_APPROACH: 5 },
    SHORT_BALL_ATTACK: { NONE: 30, DROP_SHOT: 25, NET_APPROACH: 20, LINE_CHANGE: 15, INSIDE_OUT: 10 },
    NET_PLAY: { NET_APPROACH: 50, NONE: 20, DROP_SHOT: 15, LOB: 10, PASSING: 5 },
    DEFENSE_RECOVERY: { NONE: 35, LOB: 20, PASSING: 20, LINE_CHANGE: 15, INSIDE_OUT: 10 },
    PASSING_LOB: { PASSING: 35, LOB: 25, LINE_CHANGE: 15, NONE: 15, INSIDE_OUT: 5, INSIDE_IN: 5 },
  };

  // ── UTILITY ─────────────────────────────────────────────────────────

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [key, w] of entries) { r -= w; if (r <= 0) return key; }
    return entries[entries.length - 1][0];
  }

  function clickBtn(text) {
    const btn = [...document.querySelectorAll("button")].find(
      b => b.textContent.trim().toLowerCase().includes(text.toLowerCase())
    );
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  }

  function clickBtnExact(text) {
    const btn = [...document.querySelectorAll("button")].find(
      b => b.textContent.trim() === text
    );
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  }

  async function forceClick(text, maxRetries = 15, interval = 200) {
    for (let i = 0; i < maxRetries; i++) {
      if (clickBtnExact(text)) return true;
      if (clickBtn(text)) return true;
      await sleep(interval);
    }
    console.warn(`[SIM] ⚠️ FAILED "${text}" after ${maxRetries} retries`);
    return false;
  }

  async function waitForButton(text, timeout = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if ([...document.querySelectorAll("button")].some(b => b.textContent.trim() === text && !b.disabled)) return true;
      await sleep(200);
    }
    return false;
  }

  function setInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return;
    const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    ns.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setSelect(selectorOrEl, value) {
    const el = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) return;
    const ns = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    ns.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ── TAG GENERATION (split into 2 phases) ───────────────────────────

  let pointsPlayed = 0;

  /**
   * Generate all tags based on ACTUAL server (from UI) + chosen winner.
   * This guarantees the pattern selection matches the wizard's rules.
   */
  function generateTags(isPlayerServing, winner) {
    const playerWins = winner === "me";
    const isFirstServe = Math.random() < FIRST_SERVE_IN_PCT;

    // ACE → server always wins
    if (isFirstServe && Math.random() < ACE_PROB) {
      return {
        serveNumber: "ACE",
        serveDirection: weightedPick(SERVE_DIR_W[SURFACE]),
        serveQuality: "AGGRESSIVE",
        pattern: "SERVE_DOMINANT",
        returnType: null, rallyPhase: "ATTACK_ME",
        finishType: "WINNER", finishShot: "SERVE", keyEvent: "NONE",
        overrideWinner: isPlayerServing ? "me" : "opponent",
      };
    }

    // Double fault → server always loses
    if (!isFirstServe && Math.random() < DF_PROB) {
      return {
        serveNumber: 2,
        serveDirection: weightedPick(SERVE_DIR_W[SURFACE]),
        serveQuality: "WEAK",
        pattern: "SHORT_RALLY",  // safe pattern (always available)
        returnType: null, rallyPhase: "DEFENSE_ME",
        finishType: "UNFORCED_ERROR", finishShot: "SERVE", keyEvent: "NONE",
        overrideWinner: isPlayerServing ? "opponent" : "me",
      };
    }

    const serveDir = weightedPick(SERVE_DIR_W[SURFACE]);
    const serveQual = weightedPick(isFirstServe ? SERVE_QUALITY_1ST : SERVE_QUALITY_2ND);

    // Pattern: respects who won + who served (UI's rules)
    const serverWon = (isPlayerServing && playerWins) || (!isPlayerServing && !playerWins);
    const patternWeights = {};
    for (const [pat, wS, wR] of PATTERN_WEIGHTS) {
      if (pat === "SERVE_DOMINANT" && !serverWon) continue;
      if (pat === "AGGRESSIVE_RETURN" && serverWon) continue;
      const w = isPlayerServing ? wS : wR;
      if (w > 0) patternWeights[pat] = w;
    }
    const pattern = weightedPick(patternWeights);

    const returnType = pattern === "SERVE_DOMINANT" ? null
      : pattern === "AGGRESSIVE_RETURN" ? weightedPick(RETURN_TYPES_AGG)
        : weightedPick(RETURN_TYPES_DEEP_RALLY);

    return {
      serveNumber: isFirstServe ? 1 : 2,
      serveDirection: serveDir, serveQuality: serveQual,
      pattern, returnType,
      rallyPhase: weightedPick(RALLY_PHASE_MAP[pattern] || { NEUTRAL: 100 }),
      finishType: weightedPick(FINISH_TYPE_MAP[pattern]),
      finishShot: weightedPick(FINISH_SHOT_MAP[pattern]),
      keyEvent: weightedPick(KEY_EVENT_MAP[pattern]),
      overrideWinner: null,
    };
  }

  // ── LABEL MAPS ─────────────────────────────────────────────────────

  const FINISH_LABEL = { WINNER: "Vincente", FORCED_ERROR: "Errore forzato", UNFORCED_ERROR: "Errore non forzato" };
  const SHOT_LABEL = { SERVE: "Servizio", FOREHAND: "Diritto", BACKHAND: "Rovescio", VOLLEY: "Volée", SMASH: "Smash", PASSING: "Passante", OTHER: "Altro" };
  const SERVE_DIR_LABEL = { T: "Alla T", BODY: "Corpo", WIDE: "Esterno" };
  const SERVE_QUAL_LABEL = { SAFE: "Sicuro", AGGRESSIVE: "Aggressivo", WEAK: "Debole" };
  const PATTERN_LABEL = {
    SERVE_DOMINANT: "Servizio dominante", AGGRESSIVE_RETURN: "Risposta aggressiva",
    SHORT_RALLY: "Rally breve", MEDIUM_RALLY: "Rally medio", LONG_RALLY: "Rally lungo",
    SHORT_BALL_ATTACK: "Attacco su palla corta", NET_PLAY: "Gioco a rete",
    DEFENSE_RECOVERY: "Difesa / recupero", PASSING_LOB: "Passante / lob",
  };
  const RETURN_LABEL = { DEEP: "Profonda", SHORT: "Corta", ANGLED: "Angolata", CENTRAL: "Centrale", BLOCKED: "Bloccata", AGGRESSIVE: "Aggressiva" };
  const RALLY_LABEL = { NEUTRAL: "Neutro", ATTACK_ME: "Attacco mio", ATTACK_OPP: "Attacco avversario", DEFENSE_ME: "Difesa mia", DEFENSE_OPP: "Difesa avversario" };
  const EVENT_LABEL = { NONE: "Nessuno", DROP_SHOT: "Palla corta", NET_APPROACH: "Rete", LOB: "Lob", PASSING: "Passante", LINE_CHANGE: "Lungolinea", INSIDE_OUT: "Inside-out", INSIDE_IN: "Inside-in" };

  // ── PLAY ONE POINT ─────────────────────────────────────────────────

  async function playPoint(i) {
    const W = 350;

    // ─── Step 0: pick winner and click ────
    // Quick server guess from "Serving" badge position for win probability
    const servingBadges = [...document.querySelectorAll("span")].filter(s => s.textContent.trim() === "Serving");
    let serverGuess = FIRST_SVR === "me";
    if (servingBadges.length > 0) {
      // The hero renders P1 first (left/top). If the badge is in the first half, P1 serves.
      const badge = servingBadges[0];
      const rect = badge.getBoundingClientRect();
      serverGuess = rect.y < 300; // P1 block is near the top
    }

    const winProb = serverGuess ? SVR_WIN_RATE : (1 - SVR_WIN_RATE);
    let winner = Math.random() < winProb ? "me" : "opponent";

    await forceClick(winner === "me" ? "PLAYER" : "OPPONENT");
    await sleep(W);

    // ─── Step 1 is now visible ────
    // Read the ACTUAL server from the step 1 header text
    const bodyText = document.body.innerText;
    let isPlayerServing = serverGuess; // default to guess
    if (bodyText.includes("Servizio del Player")) isPlayerServing = true;
    else if (bodyText.includes("Servizio dell")) isPlayerServing = false;

    // Generate tags using ACTUAL server + current winner
    const tags = generateTags(isPlayerServing, winner);

    // ACE/DF may override the winner
    if (tags.overrideWinner && tags.overrideWinner !== winner) {
      await forceClick("Indietro", 5);
      await sleep(W);
      winner = tags.overrideWinner;
      await forceClick(winner === "me" ? "PLAYER" : "OPPONENT");
      await sleep(W);
    }

    // Log
    const svInfo = tags.serveNumber === "ACE" ? "ACE"
      : `${tags.serveNumber}ª ${tags.serveDirection} (${tags.serveQuality})`;
    console.log(
      `[Pt ${i + 1}] ${winner === "me" ? "P1 ✓" : "P2 ✓"} | ` +
      `Serve: ${isPlayerServing ? "P1" : "P2"} ${svInfo} | ` +
      `${tags.pattern} → ${tags.finishType} (${tags.finishShot})` +
      (tags.keyEvent !== "NONE" ? ` [${tags.keyEvent}]` : "")
    );

    // ─── Step 1: Serve details ────
    if (tags.serveNumber === "ACE") {
      await forceClick("ACE");
      await sleep(W);
    } else {
      await forceClick(tags.serveNumber === 1 ? "1ª di servizio" : "2ª di servizio");
      await sleep(W);
      await forceClick(SERVE_DIR_LABEL[tags.serveDirection], 10);
      await sleep(W);
      await forceClick(SERVE_QUAL_LABEL[tags.serveQuality], 10);
      await sleep(W);

      // ─── Step 2: optionals FIRST, then pattern ────
      await waitForButton(PATTERN_LABEL[tags.pattern], 4000);

      if (tags.returnType && RETURN_LABEL[tags.returnType]) {
        await forceClick(RETURN_LABEL[tags.returnType], 5);
        await sleep(200);
      }
      if (tags.rallyPhase && RALLY_LABEL[tags.rallyPhase]) {
        await forceClick(RALLY_LABEL[tags.rallyPhase], 5);
        await sleep(200);
      }

      await forceClick(PATTERN_LABEL[tags.pattern]);
      await sleep(W);

      // ─── Step 3: optionals FIRST, then finish type ────
      await waitForButton(FINISH_LABEL[tags.finishType], 4000);

      if (tags.finishShot && SHOT_LABEL[tags.finishShot]) {
        await forceClick(SHOT_LABEL[tags.finishShot], 5);
        await sleep(200);
      }
      if (tags.keyEvent && tags.keyEvent !== "NONE" && EVENT_LABEL[tags.keyEvent]) {
        await forceClick(EVENT_LABEL[tags.keyEvent], 5);
        await sleep(200);
      }

      await forceClick(FINISH_LABEL[tags.finishType]);
      await sleep(W);
    }

    // ─── Step 4: Register ────
    await sleep(W);
    await waitForButton("Registra punto e analizza", 6000);
    await forceClick("Registra punto e analizza", 25, 300);
    await sleep(POST_POINT);

    pointsPlayed++;
  }

  // ── SETUP PHASE ────────────────────────────────────────────────────

  console.log("🎾 [TennisAI Sim v3] Starting realistic match simulation...");
  console.log(`   ${P1_NAME} vs ${P2_NAME} | ${TOURNAMENT} | ${SURFACE} | ${FORMAT}`);

  const alreadyInMatch = [...document.querySelectorAll("button")].some(
    b => b.textContent.trim() === "PLAYER" || b.textContent.trim() === "OPPONENT"
  );

  if (alreadyInMatch) {
    console.log("ℹ️ Match already in progress — skipping setup.");
  } else {
    setInput("input[placeholder='Nome giocatore']", P1_NAME);
    await sleep(TICK);
    const selects = document.querySelectorAll("select");
    if (selects.length >= 2) { setSelect(selects[1], P1_HAND); await sleep(TICK); setSelect(selects[2], P1_STYLE); await sleep(TICK); }
    clickBtn("Salva e seleziona");
    await sleep(TICK * 3);
    setInput("input[placeholder='Nome avversario']", P2_NAME);
    await sleep(TICK);
    const ti = document.querySelector("input[placeholder*='Open']") || document.querySelector("input[placeholder*='Torneo']");
    if (ti) { const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; ns.call(ti, TOURNAMENT); ti.dispatchEvent(new Event("input", { bubbles: true })); ti.dispatchEvent(new Event("change", { bubbles: true })); }
    await sleep(TICK);
    for (const s of document.querySelectorAll("select")) { const o = [...s.options].map(x => x.value); if (o.includes("Clay") && o.includes("Hard")) { setSelect(s, SURFACE); break; } }
    await sleep(TICK);
    for (const s of document.querySelectorAll("select")) { const o = [...s.options].map(x => x.value); if (o.includes("BO3") && o.includes("BO5")) { setSelect(s, FORMAT); break; } }
    await sleep(TICK);
    for (const s of document.querySelectorAll("select")) { const o = [...s.options].map(x => x.value); if (o.includes("me") && o.includes("opponent") && !o.includes("BO3")) { setSelect(s, FIRST_SVR); break; } }
    await sleep(TICK);
    const ri = document.querySelector("input[placeholder*='QF']") || document.querySelector("input[placeholder*='SF']");
    if (ri) { const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; ns.call(ri, ROUND); ri.dispatchEvent(new Event("input", { bubbles: true })); ri.dispatchEvent(new Event("change", { bubbles: true })); }
    await sleep(TICK);
    clickBtn("Avvia match live");
    await sleep(1200);
  }

  console.log("✅ Ready. Starting point simulation...");

  // ── MAIN LOOP ──────────────────────────────────────────────────────

  for (let i = 0; i < 300; i++) {
    // Match over?
    if ([...document.querySelectorAll("h2")].some(h => h.textContent.includes("Configurazione"))) {
      console.log("🏆 Match over.");
      break;
    }

    // Wait for wizard step 0
    let ready = false;
    for (let r = 0; r < 15; r++) {
      if ([...document.querySelectorAll("button")].some(b => b.textContent.trim() === "PLAYER")) { ready = true; break; }
      await sleep(500);
    }
    if (!ready) { console.log("🏁 Wizard not available. Stopping."); break; }

    await playPoint(i);
  }

  console.log(`🏁 Simulation complete! ${pointsPlayed} points played.`);
  console.log("   Download the CSV to analyze results.");
})();
