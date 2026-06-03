// src/components/live/ScoreEditModal.tsx
// Score Quick-Edit Modal — correzione rapida del punteggio in campo
// Modal fullscreen con stepper grandi, ottimizzato per tocco su tablet

import React, { useState } from "react";
import type { PointScore } from "./liveTypes";

interface ScoreEditModalProps {
    playerName?: string;
    opponentName?: string;
    setsMe: number; setsOpp: number;
    gamesMe: number; gamesOpp: number;
    pointScoreMe: PointScore; pointScoreOpp: PointScore;
    onSave: (values: {
        setsMe: number; setsOpp: number;
        gamesMe: number; gamesOpp: number;
        pointScoreMe: PointScore; pointScoreOpp: PointScore;
    }) => void;
    onClose: () => void;
}

const POINT_SCORES: PointScore[] = ["0", "15", "30", "40", "Ad"];

function Stepper({
    label, value, min, max,
    onChange, accent = "text-baseline",
}: {
    label: string; value: number; min: number; max: number;
    onChange: (v: number) => void; accent?: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">{label}</div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onChange(Math.max(min, value - 1))}
                    className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-2xl font-bold text-fog hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all select-none"
                    aria-label={`Diminuisci ${label}`}
                >
                    −
                </button>
                <div className={`font-head text-4xl font-bold tabular-nums w-14 text-center ${accent}`}>{value}</div>
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-2xl font-bold text-fog hover:bg-white/[0.08] hover:border-white/20 active:scale-95 transition-all select-none"
                    aria-label={`Aumenta ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
}

function PointPicker({
    label, value, onChange, accent = "border-ace-lime/50 bg-ace-lime/20 text-ace-lime",
}: {
    label: string; value: PointScore; onChange: (v: PointScore) => void; accent?: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-fog/50 font-semibold">{label}</div>
            <div className="flex items-center gap-2">
                {POINT_SCORES.map(ps => (
                    <button
                        key={ps}
                        onClick={() => onChange(ps)}
                        className={`w-14 h-14 rounded-2xl border-2 font-bold text-base transition-all active:scale-95 select-none ${
                            value === ps
                                ? accent
                                : "border-white/[0.08] bg-white/[0.03] text-fog hover:bg-white/[0.08] hover:border-white/20"
                        }`}
                    >
                        {ps}
                    </button>
                ))}
            </div>
        </div>
    );
}

const ScoreEditModal: React.FC<ScoreEditModalProps> = ({
    playerName, opponentName,
    setsMe: initSetsMe, setsOpp: initSetsOpp,
    gamesMe: initGamesMe, gamesOpp: initGamesOpp,
    pointScoreMe: initPme, pointScoreOpp: initPop,
    onSave, onClose,
}) => {
    const [setsMe, setSetsMe] = useState(initSetsMe);
    const [setsOpp, setSetsOpp] = useState(initSetsOpp);
    const [gamesMe, setGamesMe] = useState(initGamesMe);
    const [gamesOpp, setGamesOpp] = useState(initGamesOpp);
    const [pointScoreMe, setPointScoreMe] = useState<PointScore>(initPme);
    const [pointScoreOpp, setPointScoreOpp] = useState<PointScore>(initPop);

    const player = playerName || "Player";
    const opp = opponentName || "Opponent";

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-[#050912]/95 backdrop-blur-sm"
            style={{ animation: "courtModeIn 0.25s cubic-bezier(0.2,0.8,0.2,1) both", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-court-night/80">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-clay-amber/80 font-semibold">Correzione punteggio</div>
                    <div className="font-head text-base font-bold text-baseline mt-0.5">Score Quick-Edit</div>
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/[0.10] bg-white/[0.04] text-fog/60 hover:text-fog hover:bg-white/[0.08] transition-all"
                    aria-label="Chiudi"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-8">

                {/* SET */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <div className="text-[11px] uppercase tracking-[0.20em] text-fog/40 font-semibold mb-5 text-center">Set</div>
                    <div className="grid grid-cols-2 gap-6">
                        <Stepper label={player} value={setsMe} min={0} max={3} onChange={setSetsMe} accent="text-success" />
                        <Stepper label={opp} value={setsOpp} min={0} max={3} onChange={setSetsOpp} accent="text-error" />
                    </div>
                </div>

                {/* GAME */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <div className="text-[11px] uppercase tracking-[0.20em] text-fog/40 font-semibold mb-5 text-center">Game</div>
                    <div className="grid grid-cols-2 gap-6">
                        <Stepper label={player} value={gamesMe} min={0} max={7} onChange={setGamesMe} accent="text-success" />
                        <Stepper label={opp} value={gamesOpp} min={0} max={7} onChange={setGamesOpp} accent="text-error" />
                    </div>
                </div>

                {/* PUNTO */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <div className="text-[11px] uppercase tracking-[0.20em] text-fog/40 font-semibold mb-5 text-center">Punto</div>
                    <div className="flex flex-col gap-4">
                        <PointPicker
                            label={player}
                            value={pointScoreMe}
                            onChange={setPointScoreMe}
                            accent="border-success/50 bg-success/20 text-success"
                        />
                        <PointPicker
                            label={opp}
                            value={pointScoreOpp}
                            onChange={setPointScoreOpp}
                            accent="border-error/50 bg-error/20 text-error"
                        />
                    </div>
                </div>

                {/* Preview punteggio corretto */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-fog/40 font-semibold mb-2">Anteprima punteggio</div>
                    <div className="font-head text-2xl font-bold text-baseline">
                        <span className="text-success">{setsMe}</span>
                        <span className="text-fog/30 mx-2">–</span>
                        <span className="text-error">{setsOpp}</span>
                        <span className="text-fog/20 mx-3">·</span>
                        <span className="text-success">{gamesMe}</span>
                        <span className="text-fog/30 mx-2">–</span>
                        <span className="text-error">{gamesOpp}</span>
                        <span className="text-fog/20 mx-3">·</span>
                        <span className="text-ace-lime">{pointScoreMe}</span>
                        <span className="text-fog/30 mx-2">–</span>
                        <span className="text-ace-lime">{pointScoreOpp}</span>
                    </div>
                </div>

            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 border-t border-white/[0.08] bg-court-night/90 px-5 py-4 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] min-h-[56px] text-[14px] font-semibold text-fog/50 hover:text-fog hover:border-white/20 active:scale-95 transition-all"
                >
                    Annulla
                </button>
                <button
                    onClick={() => onSave({ setsMe, setsOpp, gamesMe, gamesOpp, pointScoreMe, pointScoreOpp })}
                    className="flex-[2] flex items-center justify-center rounded-2xl bg-ace-lime text-court-night min-h-[56px] text-[14px] font-bold shadow-[0_4px_20px_rgba(212,255,58,0.30)] hover:bg-ace-lime/90 active:scale-[0.98] transition-all"
                >
                    Salva punteggio →
                </button>
            </div>
        </div>
    );
};

export default ScoreEditModal;
