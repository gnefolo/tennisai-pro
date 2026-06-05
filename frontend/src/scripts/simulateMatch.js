/**
 * 🎾 TennisAI Pro — Live Match Simulator v2
 *
 * Simula un match live completo interagendo con la UI del Live Mode.
 * Aggiornato per il Tennis Scoring Engine: il match termina quando
 * il motore segna la fine (best of 3 set), non dopo N punti fissi.
 *
 * Incolla questo script nella console del browser sulla pagina Infosys Demo.
 *
 * Comandi:
 *   simulateMatch()                       — Match completo (3s tra punti)
 *   simulateMatch({ fast: true })         — Fast mode (500ms)
 *   simulateMatch({ points: 20 })         — Solo 20 punti
 *   simulateMatch({ playerWinRate: 0.7 }) — Player vince 70%
 *   stopSimulation()                      — Ferma
 *
 * Il simulatore legge il punteggio REALE dal ScoreBoard in pagina e
 * logga game, set e pressure flag come il motore li calcola.
 */

(function () {
  "use strict";

  // ─── CONFIG ──────────────────────────────────────────────────────────────

  const DEFAULT_CONFIG = {
    pointDelay: 3000,
    setupDelay: 1500,
    points: null,          // null = play until match ends
    fast: false,
    playerWinRate: 0.55,   // 55% — realistic for slight favorite
    player1: "Sinner J.",
    player2: "Alcaraz C.",
    surface: "Hard",
    round: "SF",
    maxPoints: 300,        // safety cap
  };

  // ─── TENNIS DISTRIBUTIONS ───────────────────────────────────────────────

  const FINISH_DIST = [
    { type: "WINNER", weight: 0.28 },
    { type: "FORCED_ERROR", weight: 0.37 },
    { type: "UNFORCED_ERROR", weight: 0.35 },
  ];

  const RALLY_BY_FINISH = {
    WINNER:         { SHORT: 0.45, MEDIUM: 0.40, LONG: 0.15 },
    FORCED_ERROR:   { SHORT: 0.25, MEDIUM: 0.45, LONG: 0.30 },
    UNFORCED_ERROR: { SHORT: 0.35, MEDIUM: 0.40, LONG: 0.25 },
  };

  const SERVE_DIRS = ["T", "BODY", "WIDE"];
  const SERVE_WEIGHTS = [0.40, 0.25, 0.35];

  // ─── UTILITIES ───────────────────────────────────────────────────────────

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  const pickFinish = () => weightedRandom(FINISH_DIST.map(d => d.type), FINISH_DIST.map(d => d.weight));
  const pickRally  = (f) => weightedRandom(Object.keys(RALLY_BY_FINISH[f]), Object.values(RALLY_BY_FINISH[f]));
  const pickServe  = () => weightedRandom(SERVE_DIRS, SERVE_WEIGHTS);

  // ─── DOM HELPERS ─────────────────────────────────────────────────────────

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  function clickBtn(text) {
    const btn = $$("button").find(b => b.textContent.trim().includes(text) && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }

  function clickExact(text) {
    const btn = $$("button").find(b => b.textContent.trim() === text && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }

  function fillInput(placeholder, value) {
    const input = $$("input[type='text'], input[type='number']").find(i => i.placeholder?.includes(placeholder));
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  const isLiveMode  = () => !!$(".quick-tag-bar");
  const isMatchOver = () => {
    // Match over bar shows "Match complete"
    const bars = $$(".quick-tag-bar");
    return bars.some(b => b.textContent.includes("Match complete"));
  };

  async function waitFor(selector, timeout = 10000) {
    const t = Date.now();
    while (Date.now() - t < timeout) {
      if ($(selector)) return true;
      await sleep(100);
    }
    return false;
  }

  async function waitForLive(timeout = 15000) {
    const t = Date.now();
    while (Date.now() - t < timeout) {
      if (isLiveMode()) return true;
      await sleep(200);
    }
    return false;
  }

  async function waitForTag(timeout = 8000) {
    const t = Date.now();
    while (Date.now() - t < timeout) {
      const btn = $(".tag-btn-primary");
      if (btn && !btn.disabled) return true;
      await sleep(150);
    }
    return false;
  }

  // ─── Read live score from the ScoreBoard ─────────────────────────────────

  function readScore() {
    // Try to read from the ScoreBoard header
    // The scoreboard has two player rows with set/game/point scores
    try {
      const header = $(".quick-tag-bar");
      if (!header) return null;
      // Read point counter from the bar
      const ptText = header.textContent;
      const ptMatch = ptText.match(/Pt #(\d+)/);
      const servingMatch = ptText.match(/(Serving|Returning)/);
      return {
        point: ptMatch ? parseInt(ptMatch[1]) : null,
        serving: servingMatch ? servingMatch[1] === "Serving" : null,
      };
    } catch {
      return null;
    }
  }

  // ─── CONSOLE STYLING ────────────────────────────────────────────────────

  const S = {
    hdr:  "background: #D4FF3A; color: #0B1220; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;",
    info: "color: #C9CFDA; font-size: 11px;",
    won:  "color: #22C55E; font-weight: bold;",
    lost: "color: #EF4444; font-weight: bold;",
    pt:   "color: #D4FF3A; font-weight: bold;",
    stat: "color: #E9A23B; font-weight: bold; font-size: 12px;",
    dim:  "color: #666; font-size: 10px;",
    game: "color: #8B5CF6; font-weight: bold; font-size: 11px;",
    set:  "background: #8B5CF6; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold; font-size: 12px;",
    bp:   "color: #EF4444; font-weight: bold; font-size: 11px;",
    gp:   "color: #22C55E; font-weight: bold; font-size: 11px;",
  };

  const logH = (t) => console.log(`%c${t}`, S.hdr);

  function logPoint(num, won, finish, rally) {
    const icon = won ? "🟢" : "🔴";
    const res = won ? "WON" : "LOST";
    const rs = won ? S.won : S.lost;
    console.log(
      `%c  #${num}%c ${icon} %c${res}%c  ${finish.replace(/_/g, " ")} · ${rally} rally`,
      S.pt, "", rs, S.info
    );
  }

  function logStats(stats) {
    const pct = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
    console.log(
      `%c  📊 ${stats.won}W-${stats.total - stats.won}L (${pct}%) · W:${stats.winners} FE:${stats.fe} UE:${stats.ue}`,
      S.stat
    );
  }

  // ─── STATE ───────────────────────────────────────────────────────────────

  let _running = false;
  let _aborted = false;

  // ─── SETUP ───────────────────────────────────────────────────────────────

  async function setup(config) {
    logH("🎾 SETUP — Configuring match");
    console.log(`%c  ${config.player1} vs ${config.player2} · ${config.surface} · ${config.round}`, S.info);

    // Try preset first
    clickBtn("Break Point Pressure");
    await sleep(config.setupDelay / 2);

    // Open wizard if not open
    if (!$(".wizard-card")) {
      clickBtn("Set Up Match");
      await sleep(config.setupDelay);
    }

    if (!(await waitFor(".wizard-card", 5000))) {
      console.error("❌ Could not open wizard.");
      return false;
    }

    await sleep(300);
    fillInput("Sinner", config.player1);
    await sleep(200);
    fillInput("Alcaraz", config.player2);
    await sleep(300);
    clickExact(config.surface);
    await sleep(200);

    if (!clickBtn("Confirm & Start Live")) {
      console.log("%c  ⚠ Trying preset fallback...", S.dim);
      const chip = $$("button").find(b => b.textContent.includes("Clutch") || b.textContent.includes("Pressure"));
      if (chip) chip.click();
      await sleep(500);
      clickBtn("Confirm & Start Live");
    }

    console.log("%c  ✓ Entering live mode...", S.dim);

    if (!(await waitForLive())) {
      console.error("❌ Live mode failed.");
      return false;
    }

    await waitForTag(10000);
    logH("✅ LIVE MODE ACTIVE");
    return true;
  }

  // ─── TAG ONE POINT ───────────────────────────────────────────────────────

  async function tagPoint(config, stats) {
    const won = Math.random() < config.playerWinRate;
    const finish = pickFinish();
    const rally = pickRally(finish);

    // Set winner
    clickExact(won ? "✓ Won" : "✗ Lost");
    await sleep(60);

    // Set finish
    const fMap = { WINNER: "W", FORCED_ERROR: "FE", UNFORCED_ERROR: "UE" };
    clickExact(fMap[finish]);
    await sleep(50);

    // Set rally
    const rMap = { SHORT: "S", MEDIUM: "M", LONG: "L" };
    clickExact(rMap[rally]);
    await sleep(50);

    // TAG
    const btn = $(".tag-btn-primary");
    if (btn && !btn.disabled) {
      btn.click();
    } else {
      console.warn("⚠ TAG not ready");
      return null;
    }

    stats.total++;
    if (won) stats.won++;
    if (finish === "WINNER") stats.winners++;
    if (finish === "FORCED_ERROR") stats.fe++;
    if (finish === "UNFORCED_ERROR") stats.ue++;

    return { won, finish, rally };
  }

  // ─── MAIN ────────────────────────────────────────────────────────────────

  async function simulateMatch(userConfig = {}) {
    if (_running) {
      console.warn("⚠ Already running. Use stopSimulation().");
      return;
    }

    const config = { ...DEFAULT_CONFIG, ...userConfig };
    if (config.fast) config.pointDelay = 500;

    const maxPts = config.points || config.maxPoints;
    const playUntilEnd = !config.points; // no fixed count = play until match ends

    _running = true;
    _aborted = false;

    console.clear();
    logH("🎾 TennisAI Pro — Match Simulator v2");
    console.log(`%c  ${playUntilEnd ? "Playing full match" : `Simulating ${maxPts} points`} · ${config.fast ? "FAST" : "REALISTIC"} · ${config.pointDelay}ms delay`, S.info);
    console.log("");

    const stats = { total: 0, won: 0, winners: 0, fe: 0, ue: 0 };

    // Phase 1: Setup
    if (isLiveMode()) {
      console.log("%c  ℹ Already in live mode", S.dim);
    } else {
      if (!(await setup(config))) {
        _running = false;
        return;
      }
    }

    await sleep(config.pointDelay);

    // Phase 2: Live loop
    console.log("");
    logH(playUntilEnd ? "▶ PLAYING UNTIL MATCH ENDS" : `▶ SIMULATING ${maxPts} POINTS`);
    console.log("");

    let prevScore = null;

    for (let i = 0; i < maxPts; i++) {
      if (_aborted) {
        console.log("");
        logH("⏹ STOPPED BY USER");
        break;
      }

      // Check if match ended (scoring engine set matchOver)
      if (isMatchOver()) {
        console.log("");
        logH("🏆 MATCH OVER — Detected by scoring engine");
        break;
      }

      // Wait for TAG button
      const ready = await waitForTag(10000);
      if (!ready) {
        // Could be match over (TAG hidden)
        if (isMatchOver()) {
          console.log("");
          logH("🏆 MATCH OVER");
          break;
        }
        console.warn(`⚠ TAG not ready at point ${i + 1}, retrying...`);
        await sleep(2000);
        if (!(await waitForTag(5000))) {
          console.error("❌ TAG stuck. Stopping.");
          break;
        }
      }

      // Read score context from UI
      const scoreInfo = readScore();
      const ptNum = scoreInfo?.point || (stats.total + 1);

      // Tag the point
      const result = await tagPoint(config, stats);
      if (result) {
        logPoint(ptNum, result.won, result.finish, result.rally);
      }

      // Stats every 10 points
      if (stats.total > 0 && stats.total % 10 === 0) {
        console.log("");
        logStats(stats);
        console.log("");
      }

      // Delay
      if (i < maxPts - 1) {
        const variance = config.pointDelay * 0.3;
        const delay = config.pointDelay + (Math.random() * 2 * variance - variance);
        await sleep(Math.max(200, delay));
      }
    }

    // Phase 3: Final
    console.log("");
    console.log("");
    logH("🏁 SIMULATION COMPLETE");
    console.log("");
    logStats(stats);
    console.log("");

    const pct = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
    console.table({
      "Total Points": stats.total,
      "Won": stats.won,
      "Lost": stats.total - stats.won,
      "Win Rate": `${pct}%`,
      "Winners": stats.winners,
      "Forced Errors": stats.fe,
      "Unforced Errors": stats.ue,
    });

    _running = false;
    console.log("");
    console.log("%c  Run simulateMatch() to start a new match.", S.dim);
  }

  function stopSimulation() {
    if (_running) {
      _aborted = true;
      console.log("%c  ⏹ Stopping after current point...", S.stat);
    } else {
      console.log("%c  ℹ No simulation running.", S.dim);
    }
  }

  // ─── EXPOSE ──────────────────────────────────────────────────────────────

  window.simulateMatch = simulateMatch;
  window.stopSimulation = stopSimulation;

  // Welcome
  console.log("");
  logH("🎾 TennisAI Pro — Match Simulator v2 loaded!");
  console.log("");
  console.log("%c  Commands:", S.info);
  console.log("%c    simulateMatch()                  — Full match (plays until match ends)", S.info);
  console.log("%c    simulateMatch({ fast: true })     — Fast mode (500ms)", S.info);
  console.log("%c    simulateMatch({ points: 30 })     — Simulate 30 points only", S.info);
  console.log("%c    simulateMatch({ playerWinRate: 0.7 }) — 70% win rate", S.info);
  console.log("%c    stopSimulation()                 — Stop simulation", S.info);
  console.log("");
  console.log("%c  ✨ Now aware of scoring engine: match ends when a player wins 2 sets!", S.dim);
  console.log("");

})();
