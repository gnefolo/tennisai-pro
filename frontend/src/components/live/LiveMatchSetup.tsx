// src/components/live/LiveMatchSetup.tsx
// REDESIGN v2 — Design System Tennis AI Pro
// ⚠️  LOGICA INVARIATA: tutti i tipi da liveTypes, labelPlayStyle da liveHelpers,
//     tutti gli handler onChange/onClick, la logica disabled del CTA (activePlayer &&
//     opponentName.trim()), tutti i value dei select/input/textarea, struttura JSX
//     completa — IDENTICI all'originale.
//     Modificati: shellCard, blockCard, fieldLabel, inputClass, selectClass,
//     textareaClass, palette cromatica, CTA gradient → ace-lime.

import React from "react";
import { CheckIcon, ArrowRightIcon } from "../../components/ui/icons";
import type {
    Handedness,
    LivePlayer,
    MatchType,
    PlayStyle,
    Surface,
} from "./liveTypes";
import { labelPlayStyle } from "./liveHelpers";

// ─── TIPI (invariati) ────────────────────────────────────────────────────────
interface LiveMatchSetupProps {
    players: LivePlayer[];
    selectedPlayerId: string;
    activePlayer: LivePlayer | null;
    newPlayerName: string;
    newPlayerHandedness: Handedness;
    newPlayerPlayStyle: PlayStyle;
    newPlayerNotes: string;
    opponentName: string;
    tournamentName: string;
    surface: Surface;
    matchType: MatchType;
    firstServer: "me" | "opponent";
    round: string;
    error?: string | null;
    onSelectedPlayerChange: (value: string) => void;
    onNewPlayerNameChange: (value: string) => void;
    onNewPlayerHandednessChange: (value: Handedness) => void;
    onNewPlayerPlayStyleChange: (value: PlayStyle) => void;
    onNewPlayerNotesChange: (value: string) => void;
    onOpponentNameChange: (value: string) => void;
    onTournamentNameChange: (value: string) => void;
    onSurfaceChange: (value: Surface) => void;
    onMatchTypeChange: (value: MatchType) => void;
    onFirstServerChange: (value: "me" | "opponent") => void;
    onRoundChange: (value: string) => void;
    onSaveNewPlayer: () => void;
    onRegisterSession: () => void;
}

// ─── DESIGN TOKEN costanti ───────────────────────────────────────────────────
const shellCard =
    "bg-court-night/95 border border-white/[0.07] rounded-[28px] p-6 md:p-8 " +
    "shadow-[var(--e-3)]";

const blockCard =
    "rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5";

const fieldLabel =
    "text-[11px] uppercase tracking-[0.16em] text-fog/50 font-semibold mb-2 block";

// Input, select, textarea: focus usa ace-lime invece di sky-500
const inputClass =
    "w-full h-10 bg-court-night/80 border border-white/[0.10] rounded-[var(--r-sm)] " +
    "px-3 text-sm text-baseline outline-none " +
    "transition-colors duration-[var(--dur-fast)] " +
    "focus:border-ace-lime/60 focus:ring-1 focus:ring-ace-lime/20";

const selectClass =
    "w-full h-10 bg-court-night/80 border border-white/[0.10] rounded-[var(--r-sm)] " +
    "px-3 text-sm text-baseline outline-none " +
    "transition-colors duration-[var(--dur-fast)] " +
    "focus:border-ace-lime/60 focus:ring-1 focus:ring-ace-lime/20";

const textareaClass =
    "w-full bg-court-night/80 border border-white/[0.10] rounded-[var(--r-sm)] " +
    "px-3 py-2.5 text-sm text-baseline outline-none resize-none h-20 " +
    "transition-colors duration-[var(--dur-fast)] " +
    "focus:border-ace-lime/60 focus:ring-1 focus:ring-ace-lime/20";

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
const LiveMatchSetup: React.FC<LiveMatchSetupProps> = ({
    players,
    selectedPlayerId,
    activePlayer,
    newPlayerName,
    newPlayerHandedness,
    newPlayerPlayStyle,
    newPlayerNotes,
    opponentName,
    tournamentName,
    surface,
    matchType,
    firstServer,
    round,
    error,
    onSelectedPlayerChange,
    onNewPlayerNameChange,
    onNewPlayerHandednessChange,
    onNewPlayerPlayStyleChange,
    onNewPlayerNotesChange,
    onOpponentNameChange,
    onTournamentNameChange,
    onSurfaceChange,
    onMatchTypeChange,
    onFirstServerChange,
    onRoundChange,
    onSaveNewPlayer,
    onRegisterSession,
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div className={shellCard}>
                <div className="max-w-6xl mx-auto flex flex-col gap-8">

                    {/* ── Hero header ── */}
                    <div className="text-center">
                        {/* Badge "Live setup" — ace-lime invece di sky */}
                        <div className="inline-flex items-center rounded-full border border-ace-lime/20 bg-ace-lime/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ace-lime font-semibold">
                            Live setup
                        </div>
                        <h2 className="mt-4 font-head text-2xl md:text-3xl font-semibold tracking-tight text-baseline">
                            Configurazione Match Live
                        </h2>
                        <p className="text-sm text-fog/60 mt-3 max-w-2xl mx-auto leading-relaxed">
                            Imposta giocatore, avversario e contesto del match prima di avviare
                            il Live Match Center.
                        </p>
                    </div>

                    {/* ── Due colonne: Player | Match ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* ─── Block: Giocatore monitorato ── */}
                        <div className={blockCard}>
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-fog/80">
                                        Giocatore monitorato
                                    </h3>
                                    <div className="text-[11px] text-fog/40 mt-1">
                                        Seleziona un profilo esistente o creane uno nuovo
                                    </div>
                                </div>
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-fog/50">
                                    Player
                                </div>
                            </div>

                            {/* Select giocatore esistente */}
                            <div>
                                <label className={fieldLabel}>Seleziona giocatore esistente</label>
                                <select
                                    value={selectedPlayerId}
                                    onChange={(e) => onSelectedPlayerChange(e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">-- Nessuno selezionato --</option>
                                    {players.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Preview giocatore attivo — success tone */}
                                {activePlayer && (
                                    <div className="mt-3 rounded-[var(--r-md)] border border-success/20 bg-success/[0.05] px-4 py-3 text-xs text-success/80 flex flex-wrap gap-4">
                                        <span>
                                            Mano:{" "}
                                            <span className="text-success font-medium">
                                                {activePlayer.handedness === "R"
                                                    ? "Destra"
                                                    : activePlayer.handedness === "L"
                                                        ? "Sinistra"
                                                        : "Ambidestro"}
                                            </span>
                                        </span>
                                        <span>
                                            Stile:{" "}
                                            <span className="text-success font-medium">
                                                {labelPlayStyle(activePlayer.playStyle)}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Divisore "oppure aggiungi nuovo" */}
                            <div className="relative flex py-5 items-center">
                                <div className="flex-grow border-t border-white/[0.06]" />
                                <span className="flex-shrink-0 mx-4 text-fog/30 text-xs italic">
                                    oppure aggiungi nuovo
                                </span>
                                <div className="flex-grow border-t border-white/[0.06]" />
                            </div>

                            {/* Form nuovo giocatore */}
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className={fieldLabel}>Nome nuovo giocatore</label>
                                    <input
                                        type="text"
                                        value={newPlayerName}
                                        onChange={(e) => onNewPlayerNameChange(e.target.value)}
                                        placeholder="Nome giocatore"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabel}>Mano</label>
                                    <select
                                        value={newPlayerHandedness}
                                        onChange={(e) =>
                                            onNewPlayerHandednessChange(e.target.value as Handedness)
                                        }
                                        className={selectClass}
                                    >
                                        <option value="R">Mano Destra</option>
                                        <option value="L">Mano Sinistra</option>
                                        <option value="A">Ambidestro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={fieldLabel}>Stile di gioco</label>
                                    <select
                                        value={newPlayerPlayStyle}
                                        onChange={(e) =>
                                            onNewPlayerPlayStyleChange(e.target.value as PlayStyle)
                                        }
                                        className={selectClass}
                                    >
                                        <option value="baseliner">Regolarista</option>
                                        <option value="all_court">All-court</option>
                                        <option value="serve_volley">Serve &amp; volley</option>
                                        <option value="counterpuncher">Contropuncher</option>
                                        <option value="other">Altro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={fieldLabel}>Note giocatore</label>
                                    <textarea
                                        value={newPlayerNotes}
                                        onChange={(e) => onNewPlayerNotesChange(e.target.value)}
                                        placeholder="Punti forti, debolezze, note tattiche..."
                                        className={textareaClass}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    {/* "Salva e seleziona" — ace-lime su dark */}
                                    <button
                                        onClick={onSaveNewPlayer}
                                        disabled={!newPlayerName.trim()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-pill)] border border-ace-lime/20 bg-ace-lime/[0.08] text-ace-lime text-[13px] font-semibold transition hover:bg-ace-lime/15 hover:border-ace-lime/40 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <CheckIcon size={16} />
                                        Salva e seleziona
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ─── Block: Avversario e contesto ── */}
                        <div className={blockCard}>
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-fog/80">
                                        Avversario e contesto
                                    </h3>
                                    <div className="text-[11px] text-fog/40 mt-1">
                                        Definisci match, superficie e condizioni iniziali
                                    </div>
                                </div>
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-fog/50">
                                    Match
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className={fieldLabel}>Avversario</label>
                                    <input
                                        type="text"
                                        value={opponentName}
                                        onChange={(e) => onOpponentNameChange(e.target.value)}
                                        placeholder="Nome avversario"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabel}>Torneo / evento</label>
                                    <input
                                        type="text"
                                        value={tournamentName}
                                        onChange={(e) => onTournamentNameChange(e.target.value)}
                                        placeholder="Es. Open, Serie C, Torneo FITP..."
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={fieldLabel}>Superficie</label>
                                    <select
                                        value={surface}
                                        onChange={(e) => onSurfaceChange(e.target.value as Surface)}
                                        className={selectClass}
                                    >
                                        <option value="Hard">Cemento</option>
                                        <option value="Clay">Terra</option>
                                        <option value="Grass">Erba</option>
                                        <option value="Other">Altro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={fieldLabel}>Formato</label>
                                    <select
                                        value={matchType}
                                        onChange={(e) =>
                                            onMatchTypeChange(e.target.value as MatchType)
                                        }
                                        className={selectClass}
                                    >
                                        <option value="BO3">Best of 3</option>
                                        <option value="BO5">Best of 5</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={fieldLabel}>Chi serve il primo game?</label>
                                    <select
                                        value={firstServer}
                                        onChange={(e) =>
                                            onFirstServerChange(e.target.value as "me" | "opponent")
                                        }
                                        className={selectClass}
                                    >
                                        <option value="me">Giocatore monitorato</option>
                                        <option value="opponent">Avversario</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={fieldLabel}>Turno</label>
                                    <input
                                        type="text"
                                        value={round}
                                        onChange={(e) => onRoundChange(e.target.value)}
                                        placeholder="Es. QF, SF, Finale"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Error state ── */}
                    {error && (
                        <div className="text-sm text-error bg-error/[0.05] border border-error/30 rounded-[var(--r-md)] px-4 py-3 text-center">
                            {error}
                        </div>
                    )}

                    {/* ── CTA principale ── */}
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={onRegisterSession}
                            disabled={!activePlayer || !opponentName.trim()}
                            className={`inline-flex items-center gap-3 px-10 py-3.5 rounded-[var(--r-pill)] text-sm font-bold tracking-wide transition-all duration-[var(--dur-med)] ${!activePlayer || !opponentName.trim()
                                ? "bg-white/[0.04] border border-white/[0.06] text-fog/30 cursor-not-allowed"
                                : "bg-ace-lime text-court-night hover:bg-ace-lime-hover hover:scale-[1.02] shadow-[var(--lime-glow)]"
                                }`}
                        >
                            Avvia match live
                            <ArrowRightIcon size={18} />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LiveMatchSetup;
