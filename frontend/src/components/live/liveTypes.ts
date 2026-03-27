// src/components/live/liveTypes.ts

// ==============================
// Tipi backend
// ==============================

export interface PatternInfoOut {
    pattern_id: number;
    pattern_name: string;
    confidence?: number | null;
    explanation?: number | string | null;
}

export interface QuickStats {
    pct_service_points_won: number;
    pct_return_points_won: number;
    pct_first_serve_points_won: number;
    pct_second_serve_points_won: number;
}

export interface PredictionResponse {
    point_win_probability: number;
    prediction: number;
    pattern_rule: PatternInfoOut;
    pattern_ml?: PatternInfoOut | null;
    pattern_fused: PatternInfoOut;
    tactical_suggestion: string[];
    quick_stats: QuickStats;

    tactical_call?: string;
    tactical_confidence?: "HIGH" | "MEDIUM" | "LOW" | string;
    momentum_state?: "HOT" | "NEUTRAL" | "COLD" | string;
    serve_state?: "SERVING_FIRST" | "SERVING_SECOND" | "RETURNING" | string;
    rally_profile?: "SHORT" | "MEDIUM" | "LONG" | string;
    pressure_state?:
    | "NEUTRAL"
    | "GAME_POINT_FOR"
    | "GAME_POINT_AGAINST"
    | "BREAK_POINT_FOR"
    | "BREAK_POINT_AGAINST"
    | string;
}

export interface LiveTaggedPointResponse extends PredictionResponse {
    tagged_pattern: string;
    point_description: string;
    next_point_pattern_hint: string;
}

// ==============================
// Tipi dominio
// ==============================

export type Handedness = "R" | "L" | "A";
export type PlayStyle =
    | "baseliner"
    | "all_court"
    | "serve_volley"
    | "counterpuncher"
    | "other";

export type Surface = "Hard" | "Clay" | "Grass" | "Other";
export type MatchType = "BO3" | "BO5";
export type PointScore = "0" | "15" | "30" | "40" | "Ad";
export type ServeDirection = "T" | "BODY" | "WIDE";

export type ServeQuality = "SAFE" | "AGGRESSIVE" | "WEAK";
export type ReturnType =
    | "DEEP"
    | "SHORT"
    | "ANGLED"
    | "CENTRAL"
    | "BLOCKED"
    | "AGGRESSIVE";
export type RallyBucket = "SHORT" | "MEDIUM" | "LONG";
export type RallyPhase =
    | "NEUTRAL"
    | "ATTACK_ME"
    | "ATTACK_OPP"
    | "DEFENSE_ME"
    | "DEFENSE_OPP";
export type KeyEvent =
    | "NONE"
    | "DROP_SHOT"
    | "NET_APPROACH"
    | "LOB"
    | "PASSING"
    | "LINE_CHANGE"
    | "INSIDE_OUT"
    | "INSIDE_IN";
export type FinishType = "WINNER" | "FORCED_ERROR" | "UNFORCED_ERROR";
export type FinishShot =
    | "SERVE"
    | "FOREHAND"
    | "BACKHAND"
    | "VOLLEY"
    | "SMASH"
    | "PASSING"
    | "OTHER";

export type FastMacroPattern =
    | "SERVE_DOMINANT"
    | "AGGRESSIVE_RETURN"
    | "SHORT_RALLY"
    | "MEDIUM_RALLY"
    | "LONG_RALLY"
    | "SHORT_BALL_ATTACK"
    | "NET_PLAY"
    | "DEFENSE_RECOVERY"
    | "PASSING_LOB";

export interface TacticalPointTag {
    serve_direction?: ServeDirection | null;
    serve_quality?: ServeQuality | null;
    return_type?: ReturnType | null;
    rally_bucket?: RallyBucket | null;
    rally_phase?: RallyPhase | null;
    key_event?: KeyEvent | null;
    finish_type?: FinishType | null;
    finish_shot?: FinishShot | null;
    point_outcome?: "WON" | "LOST" | null;
}

export interface LivePlayer {
    id: string;
    name: string;
    handedness: Handedness;
    playStyle: PlayStyle;
    notes?: string;
}

export interface LiveMatchSession {
    id: string;
    playerId: string;
    opponentName: string;
    tournament: string;
    surface: Surface;
    matchType: MatchType;
    firstServer: "me" | "opponent";
    round?: string;
    createdAt: string;
}

export interface RecordedPoint {
    id: string;
    set: number;
    game: number;
    pointNumber: number;
    isOnServe: 0 | 1;
    serveNumber: 1 | 2 | "ACE";
    serveDirection?: ServeDirection | null;
    serveQuality?: ServeQuality | null;
    returnType?: ReturnType | null;
    rallyBucket?: RallyBucket | null;
    rallyPhase?: RallyPhase | null;
    keyEvent?: KeyEvent | null;
    finishType?: FinishType | null;
    finishShot?: FinishShot | null;
    macroPattern?: FastMacroPattern | null;
    rallyCount: number;
    pctServicePointsWon: number;
    pctReturnPointsWon: number;
    pctFirstServePointsWon: number;
    pctSecondServePointsWon: number;
    momentumLast5: number;
    isBreakPoint: 0 | 1;
    isGamePoint: 0 | 1;
    isGamePointAgainst: 0 | 1;
    isPointWon?: number;
    modelPointWinProbability?: number;
    modelPatternId?: number;
    modelPatternName?: string;
    taggedPattern?: string;
    pointDescription?: string;
    nextPointPatternHint?: string;
    setScoreMe: number;
    setScoreOpp: number;
    gameScoreMe: number;
    gameScoreOpp: number;
    pointScoreMe: PointScore;
    pointScoreOpp: PointScore;
    timestamp: string;
}

export interface PersistedLiveState {
    currentSessionId: string | null;
    setNumber: number;
    gameNumber: number;
    pointNumber: number;
    setsMe: number;
    setsOpp: number;
    gamesMe: number;
    gamesOpp: number;
    pointScoreMe: PointScore;
    pointScoreOpp: PointScore;
    recordedPoints: RecordedPoint[];
}

export interface PersistedMatchRecord {
    sessionId: string;
    updatedAt: string;
    setNumber: number;
    gameNumber: number;
    pointNumber: number;
    setsMe: number;
    setsOpp: number;
    gamesMe: number;
    gamesOpp: number;
    pointScoreMe: PointScore;
    pointScoreOpp: PointScore;
    recordedPoints: RecordedPoint[];
}

export type PersistedMatchRecordMap = Record<string, PersistedMatchRecord>;