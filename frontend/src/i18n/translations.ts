// src/i18n/translations.ts — Tutte le stringhe UI in IT e EN

export type Lang = "it" | "en";

export const translations = {
  it: {
    // ── Scoreboard labels
    set: "Set",
    game: "Game",
    point: "Punto",
    serving: "In Servizio",
    player: "Giocatore",
    opponent: "Avversario",

    // ── Stats bar
    pointWin: "Prob. Punto",
    estimatedProbability: "Probabilità stimata",
    confidence: "Confidenza",
    modelConfidence: "Confidenza del modello",
    momentum: "Momentum",
    currentState: "Stato attuale",
    pressure: "Pressione",
    currentSituation: "Situazione attuale",
    pointsLogged: "Punti Registrati",
    currentDataset: "Dataset live corrente",

    // ── Tactical
    tacticalInsight: "Consiglio Tattico",
    realtimeCoaching: "Analisi in tempo reale",

    // ── Pressure states
    breakPointFor: "Break Point Favorevole",
    breakPointAgainst: "Break Point Contro",
    gamePointFor: "Game Point Favorevole",
    gamePointAgainst: "Game Point Contro",
    neutralPoint: "Punto Neutro",
    deuceAdvantage: "Deuce / Vantaggio",
    setPointFor: "Set Point Favorevole",
    setPointAgainst: "Set Point Contro",
    matchPointFor: "Match Point Favorevole",
    matchPointAgainst: "Match Point Contro",

    // ── Momentum
    hot: "IN VOLO",
    cold: "IN CALO",
    neutral: "NEUTRO",

    // ── Confidence / Risk
    high: "ALTA",
    medium: "MEDIA",
    low: "BASSA",

    // ── Pattern labels (short — usati nei tag del punto)
    serveDominant: "Servizio+1",
    aggressiveReturn: "Risposta Aggressiva",
    shortRally: "Scambio Corto",
    mediumRally: "Scambio Medio",
    longRally: "Scambio Lungo",
    shortBallAttack: "Attacco Corto",
    netPlay: "A Rete",
    defenseRecovery: "Difesa / Recupero",
    passingLob: "Passante / Lob",

    // ── Pattern labels (8 pattern backend — aligned)
    pattern1: "Servizio Sicuro",
    pattern2: "Servizio Aggressivo",
    pattern3: "Servizio Neutro",
    pattern4: "Servizio Difensivo",
    pattern5: "Risposta Aggressiva",
    pattern6: "Risposta Sicura",
    pattern7: "Risposta Neutra",
    pattern8: "Pressione in Risposta",

    // ── Buttons
    settings: "Impostazioni Match",
    resetMatch: "Reset Match",
    reportPdf: "Report PDF",
    exportCsv: "Esporta CSV",
    newMatch: "Nuovo Match",
    registerPoint: "Registra Punto",
    undo: "Annulla",
    edit: "Correggi",
    setup: "Configura Match",

    // ── Status / Nav
    liveMatch: "Live Match",
    matchOver: "Fine Match",
    archive: "Archivio Match",
    demo: "Infosys Demo",

    // ── Match info
    matchCenter: "Match Center",
    matchType: "Tipo Match",
    surface: "Superficie",
    tiebreak: "Tie-break",

    // ── Infosys Demo
    tacticalIntelligence: "Intelligenza Tattica ATP",
    preProbability: "Probabilità pre-punto e consiglio tattico",
    liveMode: "Modalità Live",
    editSetup: "Modifica setup",
    reset: "Reset",
    calculating: "Calcolo in corso…",
    aiOffline: "AI offline — modalità demo",
    recommendedPattern: "Pattern raccomandato",
    alternatives: "Alternative tattiche",
    matchStats: "Statistiche Match",
    pointsWon: "Punti Vinti",
    serveWon: "Servizio Vinto",

    // ── Mode labels (Infosys)
    fan: "Tifoso",
    coach: "Coach",
    media: "Media",
    api: "API",

    // ── Language
    language: "Lingua",
  },

  en: {
    // ── Scoreboard labels
    set: "Set",
    game: "Game",
    point: "Point",
    serving: "Serving",
    player: "Player",
    opponent: "Opponent",

    // ── Stats bar
    pointWin: "Point Win",
    estimatedProbability: "Estimated probability",
    confidence: "Confidence",
    modelConfidence: "Model confidence band",
    momentum: "Momentum",
    currentState: "Current live state",
    pressure: "Pressure",
    currentSituation: "Current score situation",
    pointsLogged: "Points Logged",
    currentDataset: "Current live dataset",

    // ── Tactical
    tacticalInsight: "Tactical Insight",
    realtimeCoaching: "Real-time coaching layer",

    // ── Pressure states
    breakPointFor: "Break Point For",
    breakPointAgainst: "Break Point Against",
    gamePointFor: "Game Point For",
    gamePointAgainst: "Game Point Against",
    neutralPoint: "Neutral Point",
    deuceAdvantage: "Deuce / Advantage",
    setPointFor: "Set Point For",
    setPointAgainst: "Set Point Against",
    matchPointFor: "Match Point For",
    matchPointAgainst: "Match Point Against",

    // ── Momentum
    hot: "HOT",
    cold: "COLD",
    neutral: "NEUTRAL",

    // ── Confidence / Risk
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",

    // ── Pattern labels (short)
    serveDominant: "Serve+1",
    aggressiveReturn: "Return",
    shortRally: "Short",
    mediumRally: "Medium",
    longRally: "Long",
    shortBallAttack: "Attack",
    netPlay: "Net",
    defenseRecovery: "Defense",
    passingLob: "Passing",

    // ── Pattern labels (8 backend patterns — aligned)
    pattern1: "Serve Safe",
    pattern2: "Serve Aggressive",
    pattern3: "Serve Neutral",
    pattern4: "Serve Defensive",
    pattern5: "Aggressive Return",
    pattern6: "Safe Return",
    pattern7: "Neutral Return",
    pattern8: "Return Pressure",

    // ── Buttons
    settings: "Match Settings",
    resetMatch: "Reset Match",
    reportPdf: "PDF Report",
    exportCsv: "Export CSV",
    newMatch: "New Match",
    registerPoint: "Register Point",
    undo: "Undo",
    edit: "Edit",
    setup: "Set Up Match",

    // ── Status / Nav
    liveMatch: "Live Match",
    matchOver: "Match Over",
    archive: "Match Archive",
    demo: "Infosys Demo",

    // ── Match info
    matchCenter: "Match Center",
    matchType: "Match Type",
    surface: "Surface",
    tiebreak: "Tiebreak",

    // ── Infosys Demo
    tacticalIntelligence: "ATP Tactical Intelligence",
    preProbability: "Pre-point probability and tactical recommendation",
    liveMode: "Live Mode",
    editSetup: "Edit setup",
    reset: "Reset",
    calculating: "Calculating prediction…",
    aiOffline: "AI offline — demo mode",
    recommendedPattern: "Recommended pattern",
    alternatives: "Tactical alternatives",
    matchStats: "Match Statistics",
    pointsWon: "Points Won",
    serveWon: "Serve Pts Won",

    // ── Mode labels (Infosys)
    fan: "Fan",
    coach: "Coach",
    media: "Media",
    api: "API",

    // ── Language
    language: "Language",
  },
} as const;

export type TranslationKey = keyof typeof translations.it;
export type Translations = typeof translations.it;
