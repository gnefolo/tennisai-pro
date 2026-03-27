import React from "react";
import type {
    Handedness,
    LivePlayer,
    MatchType,
    PlayStyle,
    Surface,
} from "./liveTypes";
import { labelPlayStyle } from "./liveHelpers";

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

const shellCard =
    "bg-slate-950/70 border border-slate-800 rounded-[28px] p-6 md:p-8";
const blockCard =
    "rounded-[24px] border border-slate-800/80 bg-slate-900/55 p-5";
const fieldLabel =
    "text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold mb-2 block";
const inputClass =
    "w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500";
const selectClass =
    "w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500";
const textareaClass =
    "w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500 resize-none h-20";

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
                    <div className="text-center">
                        <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-950/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-sky-300 font-semibold">
                            Live setup
                        </div>
                        <h2 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
                            Configurazione Match Live
                        </h2>
                        <p className="text-sm text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
                            Imposta giocatore, avversario e contesto del match prima di avviare
                            il Live Match Center.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className={blockCard}>
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                                        Giocatore monitorato
                                    </h3>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Seleziona un profilo esistente o creane uno nuovo
                                    </div>
                                </div>

                                <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                    Player
                                </div>
                            </div>

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

                                {activePlayer && (
                                    <div className="mt-3 rounded-2xl border border-emerald-700/20 bg-emerald-950/10 px-4 py-3 text-xs text-emerald-300 flex flex-wrap gap-4">
                                        <span>
                                            Mano:{" "}
                                            <span className="text-emerald-100 font-medium">
                                                {activePlayer.handedness === "R"
                                                    ? "Destra"
                                                    : activePlayer.handedness === "L"
                                                        ? "Sinistra"
                                                        : "Ambidestro"}
                                            </span>
                                        </span>
                                        <span>
                                            Stile:{" "}
                                            <span className="text-emerald-100 font-medium">
                                                {labelPlayStyle(activePlayer.playStyle)}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="relative flex py-5 items-center">
                                <div className="flex-grow border-t border-slate-800" />
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs italic">
                                    oppure aggiungi nuovo
                                </span>
                                <div className="flex-grow border-t border-slate-800" />
                            </div>

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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            <option value="serve_volley">Serve & volley</option>
                                            <option value="counterpuncher">Contropuncher</option>
                                            <option value="other">Altro</option>
                                        </select>
                                    </div>
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
                                    <button
                                        onClick={onSaveNewPlayer}
                                        disabled={!newPlayerName.trim()}
                                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold disabled:opacity-50"
                                    >
                                        Salva e seleziona
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={blockCard}>
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                                        Avversario e contesto
                                    </h3>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        Definisci match, superficie e condizioni iniziali
                                    </div>
                                </div>

                                <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {error && (
                        <div className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/50 rounded-2xl px-4 py-3 text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-center pt-2">
                        <button
                            onClick={onRegisterSession}
                            disabled={!activePlayer || !opponentName.trim()}
                            className={`px-10 py-3.5 rounded-full text-sm font-bold tracking-wide transition-all ${!activePlayer || !opponentName.trim()
                                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-sky-600 to-emerald-500 text-white hover:scale-[1.02] shadow-[0_16px_40px_rgba(14,165,233,0.18)]"
                                }`}
                        >
                            Avvia match live
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveMatchSetup;
