// ═══════════════════════════════════════════════════════════════════════
// TennisAI Pro — Realistic Match Simulator v2
// ═══════════════════════════════════════════════════════════════════════
// Paste this entire script into the browser console on
// https://tennisai-pro-green.vercel.app/live
//
// It will:
//   1. Create a player profile + configure a match (setup wizard)
//   2. Simulate a full BO3 match with REALISTIC tennis statistics
//   3. Navigate the new wizard step-by-step for each point
//
// The simulation models real tennis probabilities:
//   - Server wins ~63% of points on hard court
//   - 1st serve in ~62%, 2nd serve in ~38%
//   - ACE probability ~5% on 1st serve
//   - Double fault ~3% on 2nd serve
//   - Pattern selection weighted by context (serve/return, rally length)
//   - Finish type correlated to pattern and rally length
//   - Finish shot correlated to pattern
//   - Key events probability scaled by rally length
// ═══════════════════════════════════════════════════════════════════════

(async () => {
  "use strict";

  // ── CONFIG ───────────────────────────────────────────────────────────
  const P1_NAME = "N. Djokovic";
  const P2_NAME = "C. Alcaraz";
  const TOURNAMENT = "Roland Garros Sim";
  const SURFACE = "Clay";       // Hard | Clay | Grass | Other
  const FORMAT = "BO5";        // BO3 | BO5
  const FIRST_SVR = "me";        // "me" | "opponent"
  const ROUND = "SF";
  const P1_HAND = "R";
  const P1_STYLE = "all_court"; // baseliner | all_court | serve_volley | counterpuncher

  // Pace — ms between actions (lower = faster, but risks UI misses)
  const TICK = 120;
  const POST_POINT = 2200;  // wait for backend response

  // ── SURFACE-ADJUSTED WIN RATES ───────────────────────────────────────
  // Base server advantage varies by surface
  const SURFACE_SVR_ADV = { Hard: 0.635, Clay: 0.58, Grass: 0.67, Other: 0.62 };
  const SVR_WIN_RATE = SURFACE_SVR_ADV[SURFACE] || 0.62;

  // ── REALISTIC PROBABILITY TABLES ─────────────────────────────────────

  // 1st serve percentage (% of first serves that go in)
  const FIRST_SERVE_IN_PCT = 0.62;

  // ACE probability (given 1st serve is in)
  const ACE_PROB = SURFACE === "Grass" ? 0.09 : SURFACE === "Clay" ? 0.03 : 0.06;

  // Double fault probability (given 2nd serve)
  const DF_PROB = 0.04;

  // Pattern weights: [pattern, weight_on_serve, weight_on_return]
  // Weights are relative — they get normalized
  const PATTERN_WEIGHTS = [
    // pattern                    serve  return
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

  // Serve direction weights by surface
  const SERVE_DIR_W = {
    Clay: { T: 35, BODY: 25, WIDE: 40 },
    Hard: { T: 40, BODY: 20, WIDE: 40 },
    Grass: { T: 45, BODY: 15, WIDE: 40 },
    Other: { T: 35, BODY: 25, WIDE: 40 },
  };

  // Serve quality weights by serve number
  const SERVE_QUALITY_1ST = { AGGRESSIVE: 40, SAFE: 45, WEAK: 15 };
  const SERVE_QUALITY_2ND = { AGGRESSIVE: 15, SAFE: 55, WEAK: 30 };

  // Return type distribution
  const RETURN_TYPES_DEEP_RALLY = { DEEP: 35, CENTRAL: 25, ANGLED: 15, BLOCKED: 10, SHORT: 10, AGGRESSIVE: 5 };
  const RETURN_TYPES_AGG = { AGGRESSIVE: 40, DEEP: 25, ANGLED: 20, CENTRAL: 10, SHORT: 3, BLOCKED: 2 };

  // Rally phase by macro pattern
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

  // Finish type by pattern
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

  // Finish shot by pattern
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

  // Key event by pattern
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

  // ── UTILITY FUNCTIONS ────────────────────────────────────────────────

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /** Weighted random pick from { key: weight } object */
  function weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [key, w] of entries) {
      r -= w;
      if (r <= 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  /** Click a button by partial text (case-insensitive). Returns true if clicked. */
  function clickBtn(text) {
    const buttons = [...document.querySelectorAll("button")];
    const btn = buttons.find(b => b.textContent.trim().toLowerCase().includes(text.toLowerCase()));
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  }

  /** Click a button by EXACT text. Returns true if clicked. */
  function clickBtnExact(text) {
    const buttons = [...document.querySelectorAll("button")];
    const btn = buttons.find(b => b.textContent.trim() === text);
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  }

  /**
   * ROBUST: Try to click a button by exact text, retrying up to maxRetries times.
   * Returns true if eventually clicked, false if all retries exhausted.
   */
  async function forceClick(text, maxRetries = 15, interval = 200) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (clickBtnExact(text)) return true;
      // Also try partial match as fallback
      if (clickBtn(text)) return true;
      await sleep(interval);
    }
    console.warn(`[SIM] ⚠️ FAILED to click "${text}" after ${maxRetries} retries`);
    return false;
  }

  /** Set value on an input via React's onChange */
  function setInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el) { console.warn(`[SIM] Input "${selector}" not found`); return; }
    const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
      || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    nativeSet.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Set a <select> value via React. Accepts a CSS selector string OR a DOM element. */
  function setSelect(selectorOrEl, value) {
    const el = (typeof selectorOrEl === "string")
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;
    if (!el) { console.warn(`[SIM] Select not found`); return; }
    const nativeSet = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    nativeSet.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Wait until a button with exact text appears in the DOM */
  async function waitForButton(text, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = [...document.querySelectorAll("button")].some(
        b => b.textContent.trim() === text && !b.disabled
      );
      if (found) return true;
      await sleep(200);
    }
    return false;
  }

  // ── MATCH STATE ──────────────────────────────────────────────────────
  let pointsPlayed = 0;

  // ── POINT GENERATION ─────────────────────────────────────────────────

  function generatePoint(isPlayerServing) {
    const winProb = isPlayerServing ? SVR_WIN_RATE : (1 - SVR_WIN_RATE);
    const playerWins = Math.random() < winProb;
    const winner = playerWins ? "me" : "opponent";

    const isFirstServe = Math.random() < FIRST_SERVE_IN_PCT;
    let serveNumber = isFirstServe ? 1 : 2;

    if (isFirstServe && Math.random() < ACE_PROB) {
      return {
        winner: isPlayerServing ? "me" : "opponent",
        serveNumber: "ACE",
        serveDirection: weightedPick(SERVE_DIR_W[SURFACE] || SERVE_DIR_W.Hard),
        serveQuality: "AGGRESSIVE",
        pattern: "SERVE_DOMINANT",
        returnType: null,
        rallyPhase: "ATTACK_ME",
        finishType: "WINNER",
        finishShot: "SERVE",
        keyEvent: "NONE",
      };
    }

    if (!isFirstServe && Math.random() < DF_PROB) {
      return {
        winner: isPlayerServing ? "opponent" : "me",
        serveNumber: 2,
        serveDirection: weightedPick(SERVE_DIR_W[SURFACE] || SERVE_DIR_W.Hard),
        serveQuality: "WEAK",
        pattern: "AGGRESSIVE_RETURN",
        returnType: null,
        rallyPhase: "DEFENSE_ME",
        finishType: "UNFORCED_ERROR",
        finishShot: "SERVE",
        keyEvent: "NONE",
      };
    }

    const serveDir = weightedPick(SERVE_DIR_W[SURFACE] || SERVE_DIR_W.Hard);
    const serveQual = weightedPick(isFirstServe ? SERVE_QUALITY_1ST : SERVE_QUALITY_2ND);

    const serverWon = (isPlayerServing && playerWins) || (!isPlayerServing && !playerWins);
    const patternWeights = {};

    for (const [pat, wServe, wReturn] of PATTERN_WEIGHTS) {
      if (pat === "SERVE_DOMINANT" && !serverWon) continue;
      if (pat === "AGGRESSIVE_RETURN" && serverWon) continue;
      const baseW = isPlayerServing ? wServe : wReturn;
      if (baseW > 0) patternWeights[pat] = baseW;
    }

    const pattern = weightedPick(patternWeights);

    const returnType = pattern === "SERVE_DOMINANT"
      ? null
      : pattern === "AGGRESSIVE_RETURN"
        ? weightedPick(RETURN_TYPES_AGG)
        : weightedPick(RETURN_TYPES_DEEP_RALLY);

    const rallyPhase = weightedPick(RALLY_PHASE_MAP[pattern] || { NEUTRAL: 100 });
    const finishType = weightedPick(FINISH_TYPE_MAP[pattern] || { WINNER: 34, FORCED_ERROR: 33, UNFORCED_ERROR: 33 });
    const finishShot = weightedPick(FINISH_SHOT_MAP[pattern] || { FOREHAND: 40, BACKHAND: 30, OTHER: 30 });
    const keyEvent = weightedPick(KEY_EVENT_MAP[pattern] || { NONE: 100 });

    return {
      winner, serveNumber, serveDirection: serveDir, serveQuality: serveQual,
      pattern, returnType, rallyPhase, finishType, finishShot, keyEvent,
    };
  }

  // ── WIZARD NAVIGATION (ROBUST) ─────────────────────────────────────

  const FINISH_LABEL = {
    WINNER: "Vincente", FORCED_ERROR: "Errore forzato", UNFORCED_ERROR: "Errore non forzato",
  };
  const SHOT_LABEL = {
    SERVE: "Servizio", FOREHAND: "Diritto", BACKHAND: "Rovescio",
    VOLLEY: "Volée", SMASH: "Smash", PASSING: "Passante", OTHER: "Altro",
  };
  const SERVE_DIR_LABEL = { T: "Alla T", BODY: "Corpo", WIDE: "Esterno" };
  const SERVE_QUAL_LABEL = { SAFE: "Sicuro", AGGRESSIVE: "Aggressivo", WEAK: "Debole" };
  const PATTERN_LABEL = {
    SERVE_DOMINANT: "Servizio dominante", AGGRESSIVE_RETURN: "Risposta aggressiva",
    SHORT_RALLY: "Rally breve", MEDIUM_RALLY: "Rally medio", LONG_RALLY: "Rally lungo",
    SHORT_BALL_ATTACK: "Attacco su palla corta", NET_PLAY: "Gioco a rete",
    DEFENSE_RECOVERY: "Difesa / recupero", PASSING_LOB: "Passante / lob",
  };
  const RETURN_LABEL = {
    DEEP: "Profonda", SHORT: "Corta", ANGLED: "Angolata",
    CENTRAL: "Centrale", BLOCKED: "Bloccata", AGGRESSIVE: "Aggressiva",
  };
  const RALLY_LABEL = {
    NEUTRAL: "Neutro", ATTACK_ME: "Attacco mio", ATTACK_OPP: "Attacco avversario",
    DEFENSE_ME: "Difesa mia", DEFENSE_OPP: "Difesa avversario",
  };
  const EVENT_LABEL = {
    NONE: "Nessuno", DROP_SHOT: "Palla corta", NET_APPROACH: "Rete",
    LOB: "Lob", PASSING: "Passante", LINE_CHANGE: "Lungolinea",
    INSIDE_OUT: "Inside-out", INSIDE_IN: "Inside-in",
  };

  async function playPoint(pt) {
    const W = 250; // wait between wizard steps for React to re-render

    // ── Step 0: Winner ──
    await forceClick(pt.winner === "me" ? "PLAYER" : "OPPONENT");
    await sleep(W);

    // ── Step 1: Serve ──
    if (pt.serveNumber === "ACE") {
      await forceClick("ACE");
      await sleep(W);
      // ACE auto-fills → goes straight to review
    } else {
      // Serve number
      const svLabel = pt.serveNumber === 1 ? "1ª di servizio" : "2ª di servizio";
      await forceClick(svLabel);
      await sleep(W);

      // Serve direction — try, if button not found skip won't break
      await forceClick(SERVE_DIR_LABEL[pt.serveDirection], 8);
      await sleep(W);

      // Serve quality (this triggers step advance to 2)
      await forceClick(SERVE_QUAL_LABEL[pt.serveQuality], 8);
      await sleep(W);

      // ── Step 2: Pattern ──
      // Wait for the pattern buttons to appear
      await waitForButton(PATTERN_LABEL[pt.pattern], 3000);
      await forceClick(PATTERN_LABEL[pt.pattern]);
      await sleep(W);

      // Return type (optional — only if relevant and visible)
      if (pt.returnType && RETURN_LABEL[pt.returnType]) {
        forceClick(RETURN_LABEL[pt.returnType], 5);
        await sleep(150);
      }

      // Rally phase (optional)
      if (pt.rallyPhase && RALLY_LABEL[pt.rallyPhase]) {
        forceClick(RALLY_LABEL[pt.rallyPhase], 5);
        await sleep(150);
      }

      // ── Step 3: Finish type ──
      await waitForButton(FINISH_LABEL[pt.finishType], 3000);
      await forceClick(FINISH_LABEL[pt.finishType]);
      await sleep(W);

      // Finish shot (optional)
      if (pt.finishShot && SHOT_LABEL[pt.finishShot]) {
        forceClick(SHOT_LABEL[pt.finishShot], 5);
        await sleep(150);
      }

      // Key event (optional, skip NONE)
      if (pt.keyEvent && pt.keyEvent !== "NONE" && EVENT_LABEL[pt.keyEvent]) {
        forceClick(EVENT_LABEL[pt.keyEvent], 5);
        await sleep(150);
      }
    }

    // ── Step 4 → Register ──
    await sleep(W);
    // Wait for register button to become active
    const registered = await waitForButton("Registra punto e analizza", 5000);
    if (!registered) {
      console.warn(`[SIM] ⚠️ Register button not available, trying partial match...`);
    }
    // Force-click with many retries
    await forceClick("Registra punto e analizza", 20, 300);
    await sleep(POST_POINT);

    pointsPlayed++;
  }

  // ── SETUP PHASE ──────────────────────────────────────────────────────

  console.log("🎾 [TennisAI Sim] Starting realistic match simulation...");
  console.log(`   ${P1_NAME} vs ${P2_NAME} | ${TOURNAMENT} | ${SURFACE} | ${FORMAT}`);

  // Detect if match is already in progress (wizard visible = match already running)
  const alreadyInMatch = [...document.querySelectorAll("button")].some(
    b => b.textContent.trim() === "PLAYER" || b.textContent.trim() === "OPPONENT"
  );

  if (alreadyInMatch) {
    console.log("ℹ️ [TennisAI Sim] Match already in progress — skipping setup.");
  } else {
    // Fill player name
    setInput("input[placeholder='Nome giocatore']", P1_NAME);
    await sleep(TICK);

    // Set handedness + style
    const selects = document.querySelectorAll("select");
    if (selects.length >= 2) {
      setSelect(selects[1], P1_HAND);
      await sleep(TICK);
      setSelect(selects[2], P1_STYLE);
      await sleep(TICK);
    }

    // Save player
    clickBtn("Salva e seleziona");
    await sleep(TICK * 3);

    // Fill opponent + match context
    setInput("input[placeholder='Nome avversario']", P2_NAME);
    await sleep(TICK);

    // Tournament name — try multiple placeholder patterns
    const tournInput = document.querySelector("input[placeholder*='Open']")
      || document.querySelector("input[placeholder*='Torneo']")
      || document.querySelector("input[placeholder*='evento']");
    if (tournInput) {
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      nativeSet.call(tournInput, TOURNAMENT);
      tournInput.dispatchEvent(new Event("input", { bubbles: true }));
      tournInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await sleep(TICK);

    // Surface, format, first server selects
    const allSelects = document.querySelectorAll("select");
    for (const s of allSelects) {
      const opts = [...s.options].map(o => o.value);
      if (opts.includes("Clay") && opts.includes("Hard")) {
        setSelect(s, SURFACE); break;
      }
    }
    await sleep(TICK);

    for (const s of document.querySelectorAll("select")) {
      const opts = [...s.options].map(o => o.value);
      if (opts.includes("BO3") && opts.includes("BO5")) {
        setSelect(s, FORMAT); break;
      }
    }
    await sleep(TICK);

    for (const s of document.querySelectorAll("select")) {
      const opts = [...s.options].map(o => o.value);
      if (opts.includes("me") && opts.includes("opponent") && !opts.includes("BO3")) {
        setSelect(s, FIRST_SVR); break;
      }
    }
    await sleep(TICK);

    // Round
    const roundInput = document.querySelector("input[placeholder*='QF']")
      || document.querySelector("input[placeholder*='SF']")
      || document.querySelector("input[placeholder*='Finale']");
    if (roundInput) {
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      nativeSet.call(roundInput, ROUND);
      roundInput.dispatchEvent(new Event("input", { bubbles: true }));
      roundInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await sleep(TICK);

    // Launch match
    clickBtn("Avvia match live");
    await sleep(1000);
  }

  console.log("✅ [TennisAI Sim] Ready. Starting point simulation...");

  // ── PLAY MATCH ───────────────────────────────────────────────────────

  /** Detect who is serving by looking for the "Serving" badge in the hero.
   *  The first player column shows the badge when player is serving.
   *  Returns true if player (P1) is serving. */
  function detectPlayerServing() {
    // The LiveMatchHero renders a "Serving" <span> inside the player column.
    // We check if the first instance of "Serving" text appears in the top half
    // of the hero (P1 column) vs the bottom half (P2 column).
    const badges = [...document.querySelectorAll("span")].filter(
      s => s.textContent.trim() === "Serving"
    );
    if (badges.length === 0) return FIRST_SVR === "me"; // fallback

    // The first "Serving" badge belongs to P1 if it's in the player section
    const badge = badges[0];
    // Check if this badge is in the first or second player block
    const parent = badge.closest("div");
    if (!parent) return true;
    // If the badge's text context is near the P1 name, player is serving
    const heroText = parent.parentElement?.textContent || "";
    // Simple heuristic: if P1 name appears before "Serving" in the DOM tree, P1 serves
    return heroText.indexOf(P1_NAME) < heroText.indexOf("Serving") + 10;
  }

  const MAX_POINTS = 300;

  for (let i = 0; i < MAX_POINTS; i++) {
    // Check if match is over
    const h2s = document.querySelectorAll("h2");
    const hasSetup = [...h2s].some(h => h.textContent.includes("Configurazione"));
    if (hasSetup) {
      console.log("🏆 [TennisAI Sim] Match over (returned to setup).");
      break;
    }

    // Wait for wizard to be ready (Step 0: PLAYER/OPPONENT buttons visible)
    let retries = 0;
    while (retries < 10) {
      const ready = [...document.querySelectorAll("button")].some(
        b => b.textContent.trim() === "PLAYER"
      );
      if (ready) break;
      retries++;
      await sleep(500);
    }
    if (retries >= 10) {
      console.log("🏁 [TennisAI Sim] Wizard not available. Match likely complete.");
      break;
    }

    // Detect who is serving from the UI
    const isPlayerServing = detectPlayerServing();

    const pt = generatePoint(isPlayerServing);

    const svInfo = pt.serveNumber === "ACE"
      ? "ACE"
      : `${pt.serveNumber}ª ${pt.serveDirection} (${pt.serveQuality})`;

    console.log(
      `[Pt ${i + 1}] ${pt.winner === "me" ? "P1 ✓" : "P2 ✓"} | ` +
      `Serve: ${isPlayerServing ? "P1" : "P2"} ${svInfo} | ` +
      `${pt.pattern} → ${pt.finishType} (${pt.finishShot})` +
      (pt.keyEvent !== "NONE" ? ` [${pt.keyEvent}]` : "")
    );

    await playPoint(pt);
  }

  console.log(`🏁 [TennisAI Sim] Simulation complete! ${pointsPlayed} points played.`);
  console.log("   Download the CSV from the interface to analyze results.");

})();

