// src/hooks/useTennisScoring.ts
// Tennis Scoring Engine — Pure logic + React hook
// Implements full ATP scoring rules:
//   - Point scoring: 0→15→30→40→Game, Deuce/Advantage
//   - Tiebreak: first to 7, margin 2, serve alternates every 2 points
//   - Set: first to 6 with margin 2, tiebreak at 6-6
//   - Match: best-of-3 or best-of-5
//   - Server rotation: alternates every game
//   - Pressure flags: auto-computed from score state
//   - Running stats: svc/rtn points won/played, percentages

import { useState, useCallback } from "react";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface MatchConfig {
  bestOf: 3 | 5;
  /** true = player1 serves first */
  player1Serves: boolean;
}

export interface MatchState {
  /** Completed set scores: [[6,4], [3,6]] */
  completedSets: [number, number][];
  /** Games in current set: [p1Games, p2Games] */
  games: [number, number];
  /** Points in current game (raw count, not display).
   *  Regular: 0=0, 1=15, 2=30, 3=40, 4+=deuce territory.
   *  Tiebreak: actual point count. */
  points: [number, number];
  /** Who serves the CURRENT point (1 = player1, 2 = player2) */
  server: 1 | 2;
  /** Who started this game as server */
  gameServer: 1 | 2;
  /** Who served first in the match */
  firstServer: 1 | 2;
  /** Is current game a tiebreak? */
  isTiebreak: boolean;
  /** Total points played in tiebreak (for serve rotation) */
  tiebreakPointsPlayed: number;
  /** Current set number (1-indexed) */
  setNumber: number;
  /** Total points played in match */
  totalPoints: number;
  /** Point number within current game (1-indexed) */
  pointInGame: number;
  /** Match finished? */
  matchOver: boolean;
  /** Winner (null if not finished) */
  winner: null | 1 | 2;
  /** Best of config */
  bestOf: 3 | 5;
}

export interface PressureFlags {
  /** Returner can win this game (break the server) */
  isBreakPoint: boolean;
  /** Server can win this game */
  isGamePoint: boolean;
  /** Opponent can win this game (from player1's perspective) */
  isGamePointAgainst: boolean;
  /** Someone can win the set with this point */
  isSetPoint: boolean;
  /** Opponent can win the set */
  isSetPointAgainst: boolean;
  /** Someone can win the match with this point */
  isMatchPoint: boolean;
  /** Opponent can win the match */
  isMatchPointAgainst: boolean;
  /** Derived human-readable label */
  pressureState: string;
}

export interface RunningStats {
  /** Player 1 service points */
  svcPointsPlayed: number;
  svcPointsWon: number;
  /** Player 1 return points */
  rtnPointsPlayed: number;
  rtnPointsWon: number;
  /** Derived percentages (0-1) */
  svcPct: number;
  rtnPct: number;
}

export interface ScoringResult {
  match: MatchState;
  stats: RunningStats;
  /** Did a game just end? */
  gameJustEnded: boolean;
  /** Did a set just end? */
  setJustEnded: boolean;
  /** Did the match just end? */
  matchJustEnded: boolean;
  /** Display score at the moment the point was played */
  scoreAtPoint: string;
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const POINT_LABELS = ["0", "15", "30", "40"] as const;

// ─── PURE FUNCTIONS: CREATE ─────────────────────────────────────────────────

export function createMatch(config: MatchConfig): MatchState {
  const server: 1 | 2 = config.player1Serves ? 1 : 2;
  return {
    completedSets: [],
    games: [0, 0],
    points: [0, 0],
    server,
    gameServer: server,
    firstServer: server,
    isTiebreak: false,
    tiebreakPointsPlayed: 0,
    setNumber: 1,
    totalPoints: 0,
    pointInGame: 1,
    matchOver: false,
    winner: null,
    bestOf: config.bestOf,
  };
}

export function createInitialStats(): RunningStats {
  return {
    svcPointsPlayed: 0,
    svcPointsWon: 0,
    rtnPointsPlayed: 0,
    rtnPointsWon: 0,
    svcPct: 0,
    rtnPct: 0,
  };
}

// ─── PURE FUNCTIONS: DISPLAY ────────────────────────────────────────────────

/** "0-15", "30-40", "Deuce", "Ad-40", "40-Ad" */
export function getPointScore(match: MatchState): string {
  if (match.matchOver) return "—";
  const [p1, p2] = match.points;

  if (match.isTiebreak) {
    return `${p1}-${p2}`;
  }

  // Deuce territory
  if (p1 >= 3 && p2 >= 3) {
    if (p1 === p2) return "Deuce";
    if (p1 > p2) return "Ad-40";
    return "40-Ad";
  }

  const l1 = p1 <= 3 ? POINT_LABELS[p1] : "40";
  const l2 = p2 <= 3 ? POINT_LABELS[p2] : "40";
  return `${l1}-${l2}`;
}

/** "4-3" */
export function getGameScore(match: MatchState): string {
  return `${match.games[0]}-${match.games[1]}`;
}

/** "6-4, 3-6" or "" if no completed sets */
export function getSetScores(match: MatchState): string {
  return match.completedSets.map(([a, b]) => `${a}-${b}`).join(", ");
}

/** Full display: "6-4, 3-6 · 4-3 (30-40)" */
export function getFullScore(match: MatchState): string {
  const sets = getSetScores(match);
  const games = getGameScore(match);
  const pts = getPointScore(match);

  if (match.matchOver) {
    return sets ? `${sets}, ${games}` : games;
  }

  const parts: string[] = [];
  if (sets) parts.push(sets);
  parts.push(games);
  return `${parts.join(", ")} (${pts})`;
}

/** Compact display for header: "6-4  3-6  4-3" */
export function getSetScoresArray(match: MatchState): [number, number][] {
  return [...match.completedSets, match.games as [number, number]];
}

// ─── PURE FUNCTIONS: PRESSURE FLAGS ─────────────────────────────────────────

/** Check if player X winning the current point would win the game */
function wouldWinGame(match: MatchState, player: 1 | 2): boolean {
  const idx = player - 1;
  const oIdx = 1 - idx;
  const p = match.points[idx] + 1;
  const o = match.points[oIdx];

  if (match.isTiebreak) {
    return p >= 7 && p - o >= 2;
  }
  return p >= 4 && p - o >= 2;
}

/** Check if player X winning a game at current game score would win the set */
function wouldWinSet(games: [number, number], player: 1 | 2, isTiebreak: boolean): boolean {
  const idx = player - 1;
  const oIdx = 1 - idx;
  const g = games[idx] + 1;
  const o = games[oIdx];

  if (isTiebreak) {
    // Tiebreak game win always means set win (7-6)
    return true;
  }
  return (g >= 6 && g - o >= 2);
}

/** Check if player X winning a set would win the match */
function wouldWinMatch(completedSets: [number, number][], player: 1 | 2, bestOf: 3 | 5): boolean {
  const idx = player - 1;
  const setsWon = completedSets.filter(s => s[idx] > s[1 - idx]).length + 1; // +1 for the set they'd win
  return setsWon >= Math.ceil(bestOf / 2);
}

export function computeFlags(match: MatchState): PressureFlags {
  if (match.matchOver) {
    return {
      isBreakPoint: false,
      isGamePoint: false,
      isGamePointAgainst: false,
      isSetPoint: false,
      isSetPointAgainst: false,
      isMatchPoint: false,
      isMatchPointAgainst: false,
      pressureState: "MATCH_OVER",
    };
  }

  const server = match.server;
  const returner: 1 | 2 = server === 1 ? 2 : 1;

  // Who can win the game with this point?
  const serverCanWinGame = wouldWinGame(match, server);
  const returnerCanWinGame = wouldWinGame(match, returner);

  const isGamePoint = serverCanWinGame;
  const isBreakPoint = returnerCanWinGame;

  // Set/match points
  let isSetPoint = false;
  let isSetPointAgainst = false;
  let isMatchPoint = false;
  let isMatchPointAgainst = false;

  if (serverCanWinGame && wouldWinSet(match.games, server, match.isTiebreak)) {
    if (server === 1) {
      isSetPoint = true;
      if (wouldWinMatch(match.completedSets, 1, match.bestOf)) isMatchPoint = true;
    } else {
      isSetPointAgainst = true;
      if (wouldWinMatch(match.completedSets, 2, match.bestOf)) isMatchPointAgainst = true;
    }
  }

  if (returnerCanWinGame && wouldWinSet(match.games, returner, match.isTiebreak)) {
    if (returner === 1) {
      isSetPoint = true;
      if (wouldWinMatch(match.completedSets, 1, match.bestOf)) isMatchPoint = true;
    } else {
      isSetPointAgainst = true;
      if (wouldWinMatch(match.completedSets, 2, match.bestOf)) isMatchPointAgainst = true;
    }
  }

  // From player 1's perspective
  const isGamePointAgainst = server === 1 ? isBreakPoint : isGamePoint;

  // Derive pressure state label (from player 1's perspective)
  let pressureState = "NEUTRAL";
  if (isMatchPoint) pressureState = "MATCH_POINT_FOR";
  else if (isMatchPointAgainst) pressureState = "MATCH_POINT_AGAINST";
  else if (isSetPoint) pressureState = "SET_POINT_FOR";
  else if (isSetPointAgainst) pressureState = "SET_POINT_AGAINST";
  else if (isBreakPoint && server === 2) pressureState = "BREAK_POINT_FOR";
  else if (isBreakPoint && server === 1) pressureState = "BREAK_POINT_AGAINST";
  else if (isGamePoint && server === 1) pressureState = "GAME_POINT_FOR";
  else if (isGamePoint && server === 2) pressureState = "GAME_POINT_AGAINST";

  return {
    isBreakPoint,
    isGamePoint,
    isGamePointAgainst,
    isSetPoint,
    isSetPointAgainst,
    isMatchPoint,
    isMatchPointAgainst,
    pressureState,
  };
}

// ─── PURE FUNCTIONS: SCORE A POINT ──────────────────────────────────────────

/** Get the tiebreak server for a given point within the tiebreak */
function getTiebreakServer(tiebreakStarter: 1 | 2, pointsPlayed: number): 1 | 2 {
  const other: 1 | 2 = tiebreakStarter === 1 ? 2 : 1;
  // Point 0: starter serves
  if (pointsPlayed === 0) return tiebreakStarter;
  // After that: alternate every 2 points
  // Points 1-2: other, 3-4: starter, 5-6: other, ...
  const block = Math.floor((pointsPlayed - 1) / 2);
  return block % 2 === 0 ? other : tiebreakStarter;
}

export function scorePoint(
  prevMatch: MatchState,
  prevStats: RunningStats,
  playerWon: 1 | 2,
): ScoringResult {
  if (prevMatch.matchOver) {
    return {
      match: prevMatch,
      stats: prevStats,
      gameJustEnded: false,
      setJustEnded: false,
      matchJustEnded: false,
      scoreAtPoint: getFullScore(prevMatch),
    };
  }

  // Capture score BEFORE this point
  const scoreAtPoint = getFullScore(prevMatch);

  // Clone state
  const m: MatchState = {
    ...prevMatch,
    completedSets: prevMatch.completedSets.map(s => [...s] as [number, number]),
    games: [...prevMatch.games] as [number, number],
    points: [...prevMatch.points] as [number, number],
  };

  // Update stats (player 1 is the "focus player")
  const stats: RunningStats = { ...prevStats };
  const p1Serving = m.server === 1;

  if (p1Serving) {
    stats.svcPointsPlayed++;
    if (playerWon === 1) stats.svcPointsWon++;
  } else {
    stats.rtnPointsPlayed++;
    if (playerWon === 1) stats.rtnPointsWon++;
  }
  stats.svcPct = stats.svcPointsPlayed > 0 ? stats.svcPointsWon / stats.svcPointsPlayed : 0;
  stats.rtnPct = stats.rtnPointsPlayed > 0 ? stats.rtnPointsWon / stats.rtnPointsPlayed : 0;

  m.totalPoints++;

  // Add point to winner
  const wIdx = playerWon - 1;
  m.points[wIdx]++;

  let gameJustEnded = false;
  let setJustEnded = false;
  let matchJustEnded = false;

  // Check if game is won
  const [p1, p2] = m.points;
  let gameWinner: null | 1 | 2 = null;

  if (m.isTiebreak) {
    if (p1 >= 7 && p1 - p2 >= 2) gameWinner = 1;
    else if (p2 >= 7 && p2 - p1 >= 2) gameWinner = 2;
  } else {
    if (p1 >= 4 && p1 - p2 >= 2) gameWinner = 1;
    else if (p2 >= 4 && p2 - p1 >= 2) gameWinner = 2;
  }

  if (gameWinner !== null) {
    // ── Game won ──
    gameJustEnded = true;
    const gIdx = gameWinner - 1;
    m.games[gIdx]++;
    m.points = [0, 0];
    m.pointInGame = 1;

    // Check if set is won
    const [g1, g2] = m.games;
    let setWinner: null | 1 | 2 = null;

    if (m.isTiebreak) {
      // Tiebreak winner wins the set (score becomes 7-6)
      setWinner = gameWinner;
    } else {
      if (g1 >= 6 && g1 - g2 >= 2) setWinner = 1;
      else if (g2 >= 6 && g2 - g1 >= 2) setWinner = 2;
    }

    if (setWinner !== null) {
      // ── Set won ──
      setJustEnded = true;
      m.completedSets.push([...m.games] as [number, number]);
      m.games = [0, 0];

      // Check if match is won
      const sIdx = setWinner - 1;
      const setsWonByWinner = m.completedSets.filter(
        (s) => s[sIdx] > s[1 - sIdx]
      ).length;
      const setsNeeded = Math.ceil(m.bestOf / 2);

      if (setsWonByWinner >= setsNeeded) {
        // ── Match won ──
        matchJustEnded = true;
        m.matchOver = true;
        m.winner = setWinner;
      } else {
        m.setNumber++;
      }
    }

    // Rotate server for next game
    if (!m.matchOver) {
      if (m.isTiebreak) {
        // After tiebreak: the player who RECEIVED the first tiebreak point serves next
        const tiebreakStarter = m.gameServer;
        m.gameServer = tiebreakStarter === 1 ? 2 : 1;
        m.server = m.gameServer;
      } else {
        // Regular: toggle game server
        m.gameServer = m.gameServer === 1 ? 2 : 1;
        m.server = m.gameServer;
      }

      // Check if next game is a tiebreak (both at 6-6 in current set)
      m.isTiebreak = m.games[0] === 6 && m.games[1] === 6;
      m.tiebreakPointsPlayed = 0;
    }
  } else {
    // ── Game continues ──
    m.pointInGame++;

    // In tiebreak: update server based on points played
    if (m.isTiebreak) {
      m.tiebreakPointsPlayed++;
      m.server = getTiebreakServer(m.gameServer, m.tiebreakPointsPlayed);
    }
  }

  return {
    match: m,
    stats,
    gameJustEnded,
    setJustEnded,
    matchJustEnded,
    scoreAtPoint,
  };
}

// ─── REACT HOOK (convenience wrapper) ───────────────────────────────────────

export function useTennisScoring(config: MatchConfig) {
  const [match, setMatch] = useState<MatchState>(() => createMatch(config));
  const [stats, setStats] = useState<RunningStats>(() => createInitialStats());

  const addPoint = useCallback((playerWon: 1 | 2): ScoringResult => {
    let result: ScoringResult = {
      match, stats,
      gameJustEnded: false, setJustEnded: false, matchJustEnded: false,
      scoreAtPoint: "",
    };
    // We compute the result and set state
    result = scorePoint(match, stats, playerWon);
    setMatch(result.match);
    setStats(result.stats);
    return result;
  }, [match, stats]);

  const reset = useCallback((newConfig?: MatchConfig) => {
    const c = newConfig ?? config;
    setMatch(createMatch(c));
    setStats(createInitialStats());
  }, [config]);

  return {
    match,
    stats,
    flags: computeFlags(match),
    pointScore: getPointScore(match),
    gameScore: getGameScore(match),
    setScores: getSetScores(match),
    fullScore: getFullScore(match),
    setScoresArray: getSetScoresArray(match),
    addPoint,
    reset,
  };
}
