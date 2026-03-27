import type {
    FastMacroPattern,
    FinishType,
    LiveTaggedPointResponse,
    PlayStyle,
    PointScore,
    PredictionResponse,
    RecordedPoint,
    ServeDirection,
    TacticalPointTag,
} from "./liveTypes";

export const pillBase =
    "px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all";

export const sectionCard =
    "rounded-[24px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-4 md:p-5 shadow-[0_20px_45px_rgba(0,0,0,0.30)]";

export function scoreWon(score: PointScore): PointScore {
    switch (score) {
        case "0":
            return "15";
        case "15":
            return "30";
        case "30":
            return "40";
        case "40":
            return "Ad";
        case "Ad":
            return "Ad";
        default:
            return "15";
    }
}

export function shortMacroLabel(value?: FastMacroPattern | null): string {
    switch (value) {
        case "SERVE_DOMINANT":
            return "Serve+1";
        case "AGGRESSIVE_RETURN":
            return "Return";
        case "SHORT_RALLY":
            return "Short";
        case "MEDIUM_RALLY":
            return "Medium";
        case "LONG_RALLY":
            return "Long";
        case "SHORT_BALL_ATTACK":
            return "Attack";
        case "NET_PLAY":
            return "Net";
        case "DEFENSE_RECOVERY":
            return "Defense";
        case "PASSING_LOB":
            return "Passing";
        default:
            return "Point";
    }
}

export function labelPlayStyle(playStyle?: PlayStyle | string): string {
    switch (playStyle) {
        case "baseliner":
            return "Regolarista";
        case "all_court":
            return "All-court";
        case "serve_volley":
            return "Serve & volley";
        case "counterpuncher":
            return "Contropuncher";
        case "other":
            return "Altro";
        default:
            return "Altro";
    }
}

export function momentumSegmentClass(won: boolean, isLast: boolean): string {
    if (won) {
        return isLast
            ? "bg-emerald-300 ring-2 ring-emerald-100/50"
            : "bg-emerald-500";
    }

    return isLast ? "bg-rose-300 ring-2 ring-rose-100/50" : "bg-rose-500";
}

export function mapMacroPatternToTag(
    macroPattern: FastMacroPattern | null,
    serveDirection: ServeDirection | null,
    finishType: FinishType | null
): TacticalPointTag {
    switch (macroPattern) {
        case "SERVE_DOMINANT":
            return {
                serve_direction: serveDirection ?? "T",
                serve_quality: "AGGRESSIVE",
                return_type: null,
                rally_bucket: "SHORT",
                rally_phase: "ATTACK_ME",
                key_event: "NONE",
                finish_type: finishType ?? "WINNER",
                finish_shot: "SERVE",
            };

        case "AGGRESSIVE_RETURN":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: "AGGRESSIVE",
                rally_bucket: "SHORT",
                rally_phase: "ATTACK_ME",
                key_event: "NONE",
                finish_type: finishType ?? "WINNER",
                finish_shot: "FOREHAND",
            };

        case "SHORT_RALLY":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "SHORT",
                rally_phase: "ATTACK_ME",
                key_event: "NONE",
                finish_type: finishType ?? "WINNER",
                finish_shot: "FOREHAND",
            };

        case "MEDIUM_RALLY":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "MEDIUM",
                rally_phase: "NEUTRAL",
                key_event: "NONE",
                finish_type: finishType ?? "WINNER",
                finish_shot: "FOREHAND",
            };

        case "LONG_RALLY":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "LONG",
                rally_phase: "NEUTRAL",
                key_event: "NONE",
                finish_type: finishType ?? "WINNER",
                finish_shot: "BACKHAND",
            };

        case "SHORT_BALL_ATTACK":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "MEDIUM",
                rally_phase: "ATTACK_ME",
                key_event: "NONE",
                finish_type: finishType ?? "WINNER",
                finish_shot: "FOREHAND",
            };

        case "NET_PLAY":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "SHORT",
                rally_phase: "ATTACK_ME",
                key_event: "NET_APPROACH",
                finish_type: finishType ?? "WINNER",
                finish_shot: "VOLLEY",
            };

        case "DEFENSE_RECOVERY":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "LONG",
                rally_phase: "DEFENSE_ME",
                key_event: "NONE",
                finish_type: finishType ?? "FORCED_ERROR",
                finish_shot: "BACKHAND",
            };

        case "PASSING_LOB":
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: "MEDIUM",
                rally_phase: "ATTACK_OPP",
                key_event: "PASSING",
                finish_type: finishType ?? "WINNER",
                finish_shot: "PASSING",
            };

        default:
            return {
                serve_direction: serveDirection ?? null,
                serve_quality: null,
                return_type: null,
                rally_bucket: null,
                rally_phase: null,
                key_event: "NONE",
                finish_type: finishType ?? null,
                finish_shot: null,
            };
    }
}

function confidenceLabel(value?: string): string {
    switch (value) {
        case "HIGH":
            return "confidenza alta";
        case "MEDIUM":
            return "confidenza media";
        case "LOW":
            return "confidenza bassa";
        default:
            return "confidenza non disponibile";
    }
}

function momentumLabel(value?: string): string {
    switch (value) {
        case "HOT":
            return "inerzia positiva";
        case "COLD":
            return "inerzia negativa";
        case "NEUTRAL":
            return "inerzia neutra";
        default:
            return "inerzia da definire";
    }
}

function pressureLabel(value?: string): string {
    switch (value) {
        case "BREAK_POINT_FOR":
            return "break point a favore";
        case "BREAK_POINT_AGAINST":
            return "break point contro";
        case "GAME_POINT_FOR":
            return "game point a favore";
        case "GAME_POINT_AGAINST":
            return "game point contro";
        case "NEUTRAL":
            return "situazione neutra";
        default:
            return "pressione standard";
    }
}

function rallyProfileLabel(value?: string): string {
    switch (value) {
        case "SHORT":
            return "punto breve";
        case "MEDIUM":
            return "punto medio";
        case "LONG":
            return "punto lungo";
        default:
            return "profilo rally non definito";
    }
}

export function buildRecentSequenceInsight(
    recentMomentumPoints: RecordedPoint[]
): string {
    if (!recentMomentumPoints || recentMomentumPoints.length === 0) {
        return "Nessuna sequenza disponibile: registra i primi punti per attivare la lettura del flusso.";
    }

    const wins = recentMomentumPoints.filter((p) => p.isPointWon === 1).length;
    const losses = recentMomentumPoints.filter((p) => p.isPointWon === 0).length;
    const longRallies = recentMomentumPoints.filter(
        (p) => p.rallyBucket === "LONG"
    ).length;
    const shortRallies = recentMomentumPoints.filter(
        (p) => p.rallyBucket === "SHORT"
    ).length;
    const pressurePoints = recentMomentumPoints.filter(
        (p) =>
            p.isBreakPoint === 1 ||
            p.isGamePoint === 1 ||
            p.isGamePointAgainst === 1
    ).length;

    const lastThree = recentMomentumPoints.slice(-3);
    const lastThreeWins = lastThree.filter((p) => p.isPointWon === 1).length;

    if (wins >= 6 && lastThreeWins >= 2) {
        return "Sequenza favorevole: stai reggendo bene il flusso recente e hai costruito inerzia positiva negli ultimi punti.";
    }

    if (losses >= 6 && lastThreeWins <= 1) {
        return "Sequenza negativa: il match sta scivolando verso l’avversario e serve interrompere rapidamente il run.";
    }

    if (longRallies >= 4 && wins >= losses) {
        return "Negli scambi lunghi stai reggendo bene: il flusso recente suggerisce ordine tattico e buona tolleranza nello scambio.";
    }

    if (longRallies >= 4 && losses > wins) {
        return "Gli scambi lunghi stanno pesando: nel recente l’avversario sembra più efficace quando il punto si estende.";
    }

    if (shortRallies >= 4 && wins > losses) {
        return "Nei punti rapidi stai facendo la differenza: primo impatto e iniziativa stanno spostando il flusso del match.";
    }

    if (pressurePoints >= 3) {
        return "Fase ad alta pressione: il recente è stato segnato da molti punti pesanti e la gestione emotiva diventa decisiva.";
    }

    return "Flusso equilibrato: il match resta aperto e la differenza la fanno qualità del primo colpo e disciplina tattica.";
}

export function buildImmediateTacticalCall({
    prediction,
    taggedPrediction,
    recentSequenceInsight,
    onServe,
    isBreakPoint,
    isGamePoint,
    isGamePointAgainst,
}: {
    prediction: PredictionResponse | null;
    taggedPrediction: LiveTaggedPointResponse | null;
    recentSequenceInsight: string;
    onServe: "me" | "opponent";
    isBreakPoint: boolean;
    isGamePoint: boolean;
    isGamePointAgainst: boolean;
}): string {
    if (prediction?.tactical_call?.trim()) {
        const parts: string[] = [prediction.tactical_call.trim()];

        if (prediction.tactical_confidence) {
            parts.push(`(${confidenceLabel(prediction.tactical_confidence)})`);
        }

        const contextParts: string[] = [];

        if (prediction.momentum_state) {
            contextParts.push(momentumLabel(prediction.momentum_state));
        }

        if (prediction.pressure_state) {
            contextParts.push(pressureLabel(prediction.pressure_state));
        }

        if (prediction.rally_profile) {
            contextParts.push(rallyProfileLabel(prediction.rally_profile));
        }

        if (contextParts.length > 0) {
            parts.push(`· ${contextParts.join(" · ")}`);
        }

        return parts.join(" ");
    }

    const probability = prediction?.point_win_probability ?? null;

    if (isGamePointAgainst) {
        return "Punto delicato: proteggi margine e qualità media del colpo, senza forzare oltre il necessario.";
    }

    if (isBreakPoint && onServe === "me") {
        return "Break point contro: alza la percentuale sulla prima o costruisci una seconda molto solida e ordinata.";
    }

    if (isBreakPoint && onServe === "opponent") {
        return "Break point a favore: entra aggressivo in risposta e togli tempo all’avversario fin dal primo impatto.";
    }

    if (isGamePoint) {
        return "Game point: cerca una soluzione pulita e ad alta affidabilità, senza cambiare piano all’ultimo.";
    }

    if (probability !== null) {
        if (probability >= 0.7) {
            return "Contesto favorevole: mantieni pressione e continua sul piano tattico che ti sta dando vantaggio.";
        }
        if (probability >= 0.55) {
            return "Fase gestibile: resta disciplinato e prova a comandare il punto sul primo scambio utile.";
        }
        if (probability < 0.45) {
            return "Situazione sfavorevole: semplifica, alza margine e interrompi subito l’inerzia negativa.";
        }
    }

    if (taggedPrediction?.next_point_pattern_hint) {
        return `Prossimo sviluppo probabile: ${taggedPrediction.next_point_pattern_hint}.`;
    }

    return recentSequenceInsight;
}