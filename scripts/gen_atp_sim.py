#!/usr/bin/env python3
"""
gen_atp_sim.py — Genera uno script JS per simulare un match ATP reale in TennisAI Pro.

Lo script JS risultante riproduce ogni punto del match nella pagina LiveMatch,
misura l'accuratezza delle previsioni del modello e stampa un report finale.

Uso:
  python scripts/gen_atp_sim.py <tennisai_*.json> [<atp_pbp_*.json>]

Esempio:
  python scripts/gen_atp_sim.py tennisai_ms093_p1.json atp_pbp_ms093.json
  # → atp_sim_ms093_p1.js  (incollare nella console del browser)

Auto-detect: se <atp_pbp_*.json> non viene specificato, lo script cerca
  atp_pbp_<slug>.json nella directory corrente.
"""

from __future__ import annotations
import json
import re
import sys
from pathlib import Path


# ── Generazione array compatto dei punti ─────────────────────────────────────

def build_pts_array(recorded_points: list, pbp_points: list) -> str:
    """Produce il literal JS array MATCH_PTS con un punto per riga."""
    lines = []
    for i, pt in enumerate(recorded_points):
        # Result ATP grezzo
        if i < len(pbp_points):
            atp = pbp_points[i].get("result", "?")
        elif pt.get("serveNumber") == "ACE":
            atp = "A"
        elif pt.get("macroPattern") is None and pt.get("finishType") is None:
            atp = "DF"
        else:
            atp = {"WINNER": "W", "UNFORCED_ERROR": "UE", "FORCED_ERROR": "FE"}.get(
                pt.get("finishType") or "", "?"
            )

        sn = pt["serveNumber"]
        sn_js = f'"{sn}"' if sn == "ACE" else str(sn)
        mp = pt.get("macroPattern")
        ft = pt.get("finishType")
        mp_js = f'"{mp}"' if mp else "null"
        ft_js = f'"{ft}"' if ft else "null"

        lines.append(
            f'  [{pt["isOnServe"]},{sn_js},{pt["isPointWon"]},'
            f'{mp_js},{ft_js},{pt["rallyCount"]},{pt["isBreakPoint"]},"{atp}"]'
        )
    return "[\n" + ",\n".join(lines) + "\n]"


# ── Template JS ───────────────────────────────────────────────────────────────

JS_BODY = r"""
  // ── TIMING ────────────────────────────────────────────────────────────
  const TICK      = 100;    // ms tra azioni UI rapide
  const W         = 280;    // ms tra step del wizard
  const POST_POINT = 3500;  // ms attesa risposta API (Render free tier è lento)

  // ── ACCURACY TRACKER ─────────────────────────────────────────────────
  const results = [];
  let played = 0;

  // ── UTILITIES ─────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function clickBtn(text) {
    const btn = [...document.querySelectorAll("button")].find(
      b => b.textContent.trim().toLowerCase().includes(text.toLowerCase()) && !b.disabled
    );
    if (btn) { btn.click(); return true; }
    return false;
  }
  function clickBtnExact(text) {
    const btn = [...document.querySelectorAll("button")].find(
      b => b.textContent.trim() === text && !b.disabled
    );
    if (btn) { btn.click(); return true; }
    return false;
  }
  async function forceClick(text, maxRetries = 15, interval = 200) {
    for (let i = 0; i < maxRetries; i++) {
      if (clickBtnExact(text) || clickBtn(text)) return true;
      await sleep(interval);
    }
    console.warn(`[SIM] ⚠ FAILED "${text}" dopo ${maxRetries} tentativi`);
    return false;
  }
  async function waitForButton(text, timeout = 8000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if ([...document.querySelectorAll("button")].some(
        b => b.textContent.trim() === text && !b.disabled)) return true;
      await sleep(150);
    }
    return false;
  }
  function setInput(selector, val) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, val);
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function setSelect(el, val) {
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, val);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ── LABEL MAPS (Italian UI) ────────────────────────────────────────────
  const FINISH_LABEL = {
    WINNER: "Vincente",
    FORCED_ERROR: "Errore forzato",
    UNFORCED_ERROR: "Errore non forzato",
  };
  const PATTERN_LABEL = {
    SERVE_DOMINANT:    "Servizio dominante",
    AGGRESSIVE_RETURN: "Risposta aggressiva",
    SHORT_RALLY:       "Rally breve",
    MEDIUM_RALLY:      "Rally medio",
    LONG_RALLY:        "Rally lungo",
    SHORT_BALL_ATTACK: "Attacco su palla corta",
    NET_PLAY:          "Gioco a rete",
    DEFENSE_RECOVERY:  "Difesa / recupero",
    PASSING_LOB:       "Passante / lob",
  };

  // ── PLAY ONE POINT ────────────────────────────────────────────────────
  async function playPoint(i, pt) {
    const [isOnServe, serveNumber, isPointWon, macroPattern, finishType,
           rallyCount, isBreakPoint, atpResult] = pt;

    // Fallback per DF (macroPattern/finishType null)
    const effPattern = macroPattern || "SHORT_RALLY";
    const effFinish  = finishType   || "UNFORCED_ERROR";
    const winner     = isPointWon === 1 ? "me" : "opponent";

    // Step 0: scegli vincitore
    await forceClick(winner === "me" ? "PLAYER" : "OPPONENT");
    await sleep(W);

    if (serveNumber === "ACE") {
      await forceClick("ACE");
      await sleep(W);
    } else {
      // Step 1: servizio (numero, direzione, qualità)
      await forceClick(serveNumber === 1 ? "1ª di servizio" : "2ª di servizio");
      await sleep(W);
      await forceClick("Alla T", 5, 150);
      await sleep(150);
      await forceClick(serveNumber === 1 ? "Sicuro" : "Debole", 5, 150);
      await sleep(W);

      // Step 2: pattern tattico
      await waitForButton(PATTERN_LABEL[effPattern], 6000);
      await forceClick(PATTERN_LABEL[effPattern]);
      await sleep(W);

      // Step 3: tipo di chiusura
      await waitForButton(FINISH_LABEL[effFinish], 6000);
      await forceClick(FINISH_LABEL[effFinish]);
      await sleep(W);
    }

    // Registra e aspetta risposta AI
    await waitForButton("Registra punto e analizza", 8000);
    await forceClick("Registra punto e analizza", 30, 250);

    // Attesa adattiva: sonda localStorage finché il nuovo punto appare
    const prevLen = played;
    const deadline = Date.now() + POST_POINT + 60000; // max 60s extra (cold start Render)
    let lastPt = null;
    while (Date.now() < deadline) {
      await sleep(500);
      try {
        const state = JSON.parse(localStorage.getItem("tennisai_live_active_state") || "{}");
        const pts = state.recordedPoints || [];
        if (pts.length > prevLen) { lastPt = pts[pts.length - 1]; break; }
      } catch(e) {}
    }

    // Cattura predizione dal punto appena registrato
    let modelProb = null, modelPattern = null, correct = null;
    if (lastPt) {
      modelProb    = lastPt.modelPointWinProbability ?? null;
      modelPattern = lastPt.modelPatternName ?? null;
      if (modelProb != null)
        correct = ((modelProb >= 0.5 ? 1 : 0) === isPointWon);
    }

    results.push({
      i: i + 1,
      on_serve: isOnServe, won: isPointWon, p_win: modelProb,
      pattern: macroPattern, model_pattern: modelPattern,
      is_bp: isBreakPoint, rally: rallyCount, atp: atpResult, correct,
    });

    const probStr = modelProb != null ? `${(modelProb * 100).toFixed(0)}%` : "---";
    const okStr   = correct == null ? "?" : correct ? "✓" : "✗";
    console.log(
      `[P${String(i + 1).padStart(3)}/${atpResult}] ${winner === "me" ? "ME " : "OPP"} | ` +
      `${isOnServe ? "SRV" : "RTN"}${serveNumber === "ACE" ? "(ACE)" : serveNumber === 1 ? " 1st" : " 2nd"} | ` +
      `${effPattern.slice(0, 14).padEnd(14)} → ${effFinish.slice(0, 14).padEnd(14)} | ` +
      `Model: ${probStr.padStart(4)} ${okStr}`
    );

    played++;
  }

  // ── SETUP MATCH ───────────────────────────────────────────────────────
  console.log("🎾 [ATP Sim] " + META.player1 + " vs " + META.player2);
  console.log("   " + META.tournament + " | " + META.surface + " | " + META.round);
  console.log("   " + MATCH_PTS.length + " punti reali ATP da riprodurre...\n");

  // Reset match in corso (se presente)
  const resetEl = [...document.querySelectorAll("button")]
    .find(b => b.textContent.includes("Reset Match"));
  if (resetEl) {
    resetEl.click(); await sleep(600);
    const confirmEl = [...document.querySelectorAll("button")]
      .find(b => /conferma|s[iì]/i.test(b.textContent.trim()));
    if (confirmEl) { confirmEl.click(); await sleep(900); }
  }

  // Salta setup se il wizard del punto è già visibile
  const inMatch = [...document.querySelectorAll("button")]
    .some(b => b.textContent.trim() === "PLAYER" || b.textContent.trim() === "OPPONENT");

  if (!inMatch) {
    // Player name + save
    setInput("input[placeholder='Nome giocatore']", META.player1);
    await sleep(TICK);
    const saveBtn = [...document.querySelectorAll("button")]
      .find(b => b.textContent.includes("Salva e seleziona"));
    if (saveBtn) { saveBtn.click(); await sleep(300); }

    // Opponent + tournament + round
    setInput("input[placeholder='Nome avversario']", META.player2);
    await sleep(TICK);
    const tiEl = document.querySelector(
      "input[placeholder*='Open'], input[placeholder*='Torneo'], input[placeholder*='evento']"
    );
    if (tiEl) setInput(tiEl, META.tournament);
    await sleep(TICK);
    const riEl = document.querySelector(
      "input[placeholder*='QF'], input[placeholder*='SF'], input[placeholder*='Turno']"
    );
    if (riEl) setInput(riEl, META.round);
    await sleep(TICK);

    // Selects (superficie, formato, primo servizio)
    for (const s of document.querySelectorAll("select")) {
      const opts = [...s.options].map(o => o.value);
      if (opts.includes("Clay") && opts.includes("Hard")) { setSelect(s, META.surface); continue; }
      if (opts.includes("BO3")  && opts.includes("BO5"))  { setSelect(s, META.matchType); continue; }
      if (opts.includes("me")   && opts.includes("opponent") && !opts.includes("BO3"))
        setSelect(s, META.firstServer);
    }
    await sleep(TICK);

    // Avvia match
    const startBtn = [...document.querySelectorAll("button")]
      .find(b => b.textContent.includes("Avvia match live"));
    if (startBtn) { startBtn.click(); await sleep(1500); }
  }

  console.log("✅ Setup completato. Avvio simulazione punti...\n");

  // ── MAIN LOOP ─────────────────────────────────────────────────────────
  for (let i = 0; i < MATCH_PTS.length; i++) {
    // Attendi il wizard step-0 (pulsante PLAYER)
    let ready = false;
    for (let r = 0; r < 30; r++) {
      if ([...document.querySelectorAll("button")]
        .some(b => b.textContent.trim() === "PLAYER")) { ready = true; break; }
      await sleep(400);
    }
    if (!ready) { console.log("🏁 Wizard non disponibile. Stop."); break; }

    await playPoint(i, MATCH_PTS[i]);

    // Progress ogni 10 punti
    if ((i + 1) % 10 === 0) {
      const v = results.filter(r => r.p_win != null);
      const a = v.length ? (v.filter(r => r.correct).length / v.length * 100).toFixed(1) : "N/A";
      const b = v.length ? (v.reduce((s, r) => s + (r.p_win - r.won) ** 2, 0) / v.length).toFixed(4) : "N/A";
      console.log(`\n  📊 [${i + 1}/${MATCH_PTS.length}] accuracy=${a}% | brier=${b}\n`);
    }
  }

  // ── REPORT FINALE ─────────────────────────────────────────────────────
  const v = results.filter(r => r.p_win != null);
  const n = v.length || 1;
  const acc     = v.filter(r => r.correct).length / n;
  const brier   = v.reduce((s, r) => s + (r.p_win - r.won) ** 2, 0) / n;
  const logloss = -v.reduce((s, r) => {
    const p = Math.max(0.001, Math.min(0.999, r.p_win));
    return s + r.won * Math.log(p) + (1 - r.won) * Math.log(1 - p);
  }, 0) / n;

  const srv = v.filter(r => r.on_serve === 1);
  const rtn = v.filter(r => r.on_serve === 0);
  const bp  = v.filter(r => r.is_bp === 1);
  const sAcc = srv.length ? srv.filter(r => r.correct).length / srv.length : null;
  const rAcc = rtn.length ? rtn.filter(r => r.correct).length / rtn.length : null;
  const bAcc = bp.length  ? bp.filter(r  => r.correct).length / bp.length  : null;

  // Calibrazione per bucket di confidenza
  const buckets = [
    ["  <30%", v.filter(r => r.p_win <  0.30)],
    ["30-50%", v.filter(r => r.p_win >= 0.30 && r.p_win < 0.50)],
    ["50-70%", v.filter(r => r.p_win >= 0.50 && r.p_win < 0.70)],
    [" >70%",  v.filter(r => r.p_win >= 0.70)],
  ];

  const hr = "═".repeat(54);
  console.log("\n" + hr);
  console.log("  🎾 REPORT FINALE — ACCURATEZZA MODELLO TENNISAI PRO");
  console.log("  " + META.player1 + " vs " + META.player2);
  console.log("  " + META.tournament);
  console.log("  " + META.surface + " | " + META.matchType + " | " + META.round);
  console.log(hr);
  console.log("  Punti simulati   : " + played + " / " + MATCH_PTS.length);
  console.log("  Con previsione AI: " + v.length + " / " + played);
  console.log("");
  console.log("  METRICHE                  VALORE   BASELINE");
  console.log("  ─────────────────────────────────────────────");
  console.log("  Accuracy (≥50% = win)   : " + (acc * 100).toFixed(1).padStart(5) + "%  (casuale ≈ 50%)");
  console.log("  Brier Score             : " + brier.toFixed(4) + "  (casuale=0.25, ottimo<0.20)");
  console.log("  Log Loss                : " + logloss.toFixed(4) + "  (casuale=0.693, ottimo<0.5)");
  console.log("");
  console.log("  PER SITUAZIONE");
  console.log("  ─────────────────────────────────────────────");
  if (sAcc != null) console.log("  In servizio             : " + (sAcc * 100).toFixed(1) + "% (n=" + srv.length + ")");
  if (rAcc != null) console.log("  In risposta             : " + (rAcc * 100).toFixed(1) + "% (n=" + rtn.length + ")");
  if (bAcc != null) console.log("  Break point             : " + (bAcc * 100).toFixed(1) + "% (n=" + bp.length + ")");
  console.log("");
  console.log("  CALIBRAZIONE (prob prevista → % punti realmente vinti)");
  console.log("  ─────────────────────────────────────────────");
  for (const [range, pts] of buckets) {
    if (!pts.length) continue;
    const avgP  = pts.reduce((s, r) => s + r.p_win, 0) / pts.length;
    const realW = pts.filter(r => r.won === 1).length / pts.length;
    const bar   = "█".repeat(Math.round(realW * 20)).padEnd(20, "░");
    console.log(
      "  " + range + " |" + bar + "| " +
      "pred=" + (avgP * 100).toFixed(0).padStart(3) + "%" +
      "  reale=" + (realW * 100).toFixed(0).padStart(3) + "%" +
      "  n=" + pts.length
    );
  }
  console.log(hr);
  console.log("  💾 Dati in: window.__SIM_RESULTS__  (array di " + results.length + " oggetti)");
  console.log("     Es: window.__SIM_RESULTS__.filter(r => r.is_bp).map(r => r.p_win)");
  console.log(hr);

  window.__SIM_RESULTS__ = results;
  window.__SIM_META__    = META;
"""


# ── Generatore principale ─────────────────────────────────────────────────────

def generate(tennisai_path: str, pbp_path: str | None = None) -> Path:
    data = json.loads(Path(tennisai_path).read_text())
    if data.get("format") != "tennisai_import_v1":
        print("Errore: file non in formato tennisai_import_v1", file=sys.stderr)
        sys.exit(1)

    pbp_points: list = []
    if pbp_path and Path(pbp_path).exists():
        pbp_points = json.loads(Path(pbp_path).read_text()).get("points", [])

    meta = data["meta"]
    session = data["session"]
    recorded = data["liveState"]["recordedPoints"]

    p1         = meta["player1"]
    p2         = meta["player2"]
    tournament = meta.get("tournament", "")
    surface    = meta.get("surface", "Clay")
    match_type = session.get("matchType", "BO3")
    first_svr  = session.get("firstServer", "me")
    round_     = meta.get("round", "")

    pts_array = build_pts_array(recorded, pbp_points)

    # ── Header con dati embedded ──────────────────────────────────────────
    header = f"""// {"═" * 68}
// TennisAI Pro — ATP Real Match Simulator
// Match  : {p1} vs {p2}
// Torneo : {tournament}
// Campi  : {surface} | {match_type} | {round_}
// Punti  : {len(recorded)}
//
// ISTRUZIONI:
//   1. Apri TennisAI Pro → Dashboard → Live Match
//   2. Incolla questo script nella console del browser (F12 → Console)
//   3. Lo script configura il match, gioca tutti i {len(recorded)} punti reali ATP
//      e stampa un report di accuratezza del modello a fine partita.
//   4. window.__SIM_RESULTS__ contiene i dati per analisi avanzata.
//
// NOTA: Il backend su Render free tier può impiegare fino a 60s al primo
//   avvio. Lo script attende automaticamente la risposta.
// {"═" * 68}
(async () => {{
  "use strict";

  // ── METADATI MATCH ────────────────────────────────────────────────────
  const META = {{
    player1:     {json.dumps(p1)},
    player2:     {json.dumps(p2)},
    tournament:  {json.dumps(tournament)},
    surface:     {json.dumps(surface)},
    matchType:   {json.dumps(match_type)},
    firstServer: {json.dumps(first_svr)},
    round:       {json.dumps(round_)},
  }};

  // Ogni riga: [isOnServe, serveNumber, isPointWon, macroPattern, finishType,
  //             rallyCount, isBreakPoint, atpResult]
  //   atpResult: A=Ace  DF=DoubleFault  W=Winner  UE=UnforcedError  FE=ForcedError
  const MATCH_PTS = {pts_array};
"""

    footer = "\n})();\n"

    slug = re.sub(r"[^\w-]", "_",
                  Path(tennisai_path).stem
                  .replace("tennisai_", "")
                  .rstrip("_"))
    out_path = Path(f"atp_sim_{slug}.js")
    out_path.write_text(header + JS_BODY + footer, encoding="utf-8")

    print(f"=== gen_atp_sim ===")
    print(f"Match  : {p1} vs {p2}")
    print(f"Torneo : {tournament}")
    print(f"Punti  : {len(recorded)}")
    print(f"\n✓ Generato: {out_path} ({out_path.stat().st_size:,} bytes)")
    print(f"  Apri TennisAI Pro → Live Match → incolla nella console del browser")
    return out_path


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    tennisai_path = sys.argv[1]
    pbp_path = sys.argv[2] if len(sys.argv) > 2 else None

    # Auto-detect pbp
    if not pbp_path:
        stem = Path(tennisai_path).stem          # tennisai_ms093_p1
        slug = re.sub(r"_p[12]$", "", stem.replace("tennisai_", ""))
        candidate = Path(f"atp_pbp_{slug}.json")
        if candidate.exists():
            pbp_path = str(candidate)
            print(f"Auto-detect PBP: {pbp_path}")

    generate(tennisai_path, pbp_path)


if __name__ == "__main__":
    main()
