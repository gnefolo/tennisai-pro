from typing import Dict, Any, List


def confidence_band(proba: float) -> str:
    if proba >= 0.70:
        return "HIGH"
    if proba >= 0.55:
        return "MEDIUM"
    return "LOW"


def get_momentum_state(momentum_trend: float, last_n_points_won_5: float) -> str:
    if momentum_trend >= 0.15 or last_n_points_won_5 >= 0.70:
        return "HOT"
    if momentum_trend <= -0.15 or last_n_points_won_5 <= 0.35:
        return "COLD"
    return "NEUTRAL"


def get_serve_state(is_on_serve: int, serve_number: int) -> str:
    if is_on_serve == 1:
        return "SERVING_FIRST" if serve_number == 1 else "SERVING_SECOND"
    return "RETURNING"


def get_rally_profile(rally_count: int) -> str:
    if rally_count <= 3:
        return "SHORT"
    if rally_count <= 7:
        return "MEDIUM"
    return "LONG"


def get_pressure_state(row: Dict[str, Any]) -> str:
    is_break_point = row.get("is_break_point", 0) == 1
    is_game_point = row.get("is_game_point", 0) == 1
    is_game_point_against = row.get("is_game_point_against", 0) == 1

    if is_game_point_against:
        return "GAME_POINT_AGAINST"
    if is_break_point and row.get("is_player_on_serve", 0) == 1:
        return "BREAK_POINT_AGAINST"
    if is_break_point and row.get("is_player_on_serve", 0) == 0:
        return "BREAK_POINT_FOR"
    if is_game_point:
        return "GAME_POINT_FOR"
    return "NEUTRAL"


def build_next_point_hint(pattern_id: int, is_on_serve: int) -> str:
    if is_on_serve == 1:
        return {
            1: "serve_plus_one_safe",
            2: "serve_plus_one_aggressive",
            3: "serve_neutral_build",
            4: "serve_under_pressure_safe",
        }.get(pattern_id, "serve_neutral_build")

    return {
        5: "return_pressure",
        6: "return_safe",
        7: "neutral_return_build",
        8: "return_pressure",
    }.get(pattern_id, "neutral_return_build")


def build_tagged_pattern_name(tag: Dict[str, Any]) -> str:
    parts = []

    if tag.get("serve_direction"):
        parts.append(f"Serve {tag['serve_direction']}")
    if tag.get("return_type"):
        parts.append(f"Return {tag['return_type']}")
    if tag.get("rally_phase"):
        parts.append(f"Rally {tag['rally_phase']}")
    if tag.get("finish_type"):
        parts.append(f"Finish {tag['finish_type']}")

    return " | ".join(parts) if parts else "Generic live point"


def build_point_description(
    row: Dict[str, Any],
    proba: float,
    fused_pattern_name: str,
    momentum_state: str,
    rally_profile: str,
    pressure_state: str,
) -> str:
    side = "al servizio" if row.get("is_player_on_serve", 0) == 1 else "in risposta"
    rally_count = row.get("RallyCount", 0)

    return (
        f"Punto {side}, rally count {rally_count}, profilo {rally_profile}, "
        f"momento {momentum_state}, pressione {pressure_state}. "
        f"Pattern prevalente: {fused_pattern_name}. "
        f"Probabilità stimata: {proba:.1%}."
    )


def get_prob_regime(proba: float) -> str:
    if proba > 0.65:
        return "FAVORABLE"
    if proba >= 0.45:
        return "NEUTRAL"
    return "UNFAVORABLE"


def build_tactical_payload(row: Dict[str, Any], proba: float, pattern_id: int) -> Dict[str, Any]:
    momentum_state = get_momentum_state(
        row.get("momentum_trend", 0.0),
        row.get("last_n_points_won_5", 0.5),
    )
    serve_state = get_serve_state(
        row.get("is_player_on_serve", 0),
        row.get("ServeNumber", 1),
    )
    rally_profile = get_rally_profile(row.get("RallyCount", 4))
    pressure_state = get_pressure_state(row)
    
    regime = get_prob_regime(proba)
    
    tactical_call = "Costruisci il punto con pazienza."
    tactical_explanation = "Situazione equilibrata, gioca il tuo tennis percentuale."
    risk_level = "MEDIUM"
    tactical_confidence = "MEDIUM"
    suggestions = []

    # 1. Base regime logic
    if regime == "FAVORABLE":
        risk_level = "HIGH"
        tactical_confidence = "HIGH" if proba > 0.75 else "MEDIUM"
        suggestions.append("Vantaggio statistico: comanda lo scambio.")
    elif regime == "UNFAVORABLE":
        risk_level = "LOW"
        tactical_confidence = "HIGH" if proba < 0.30 else "MEDIUM"
        suggestions.append("Svantaggio statistico: gioca solido, riduci errori gratuiti.")
    else:
        risk_level = "MEDIUM"
        tactical_confidence = "LOW"

    # Favorable + positive momentum -> pressione / chiusura del punto
    if regime == "FAVORABLE" and momentum_state == "HOT":
        tactical_call = "Pressione massima e chiusura del punto."
        tactical_explanation = "Hai sia il momentum che le probabilità a favore. Non far respirare l'avversario e prendi l'iniziativa per chiudere."
        risk_level = "HIGH"
    
    # Unfavorable + negative momentum -> stabilizza / riduci rischio
    elif regime == "UNFAVORABLE" and momentum_state == "COLD":
        tactical_call = "Stabilizza lo scambio, riduci il rischio."
        tactical_explanation = "Inerzia e probabilità sfavorevoli. Evita colpi a bassa percentuale, alza la traiettoria e allunga lo scambio per ritrovare ritmo."
        risk_level = "LOW"

    # SERVING_SECOND -> profondità, margine, costruzione
    if serve_state == "SERVING_SECOND":
        suggestions.append("Sulla seconda privilegia profondità, margine e posizione temporale.")
        if regime == "UNFAVORABLE":
            tactical_call = "Seconda palla: costruisci con margine."
            tactical_explanation = "Proteggi il servizio. Cerca profondità e kick per allontanare l'avversario, senza forzare vincenti immediati."
            risk_level = "LOW"
        else:
            tactical_call = "Difendi la seconda scendendo in campo."
            tactical_explanation = "Non subire l'iniziativa sulla seconda, usa la rotazione per tenerti profondo."

    # RETURNING + BREAK_POINT_FOR -> risposta aggressiva
    if serve_state == "RETURNING" and pressure_state == "BREAK_POINT_FOR":
        tactical_call = "Risposta offensiva. Prendi il controllo."
        tactical_explanation = "Palla break vitale. Anticipa la risposta e metti subito i piedi in campo."
        risk_level = "HIGH"

    # pressure alto -> pattern ad alta percentuale
    if pressure_state in ["GAME_POINT_AGAINST", "BREAK_POINT_AGAINST", "GAME_POINT_FOR"]:
        if pressure_state != "GAME_POINT_FOR":
            tactical_call = "Usa il tuo schema migliore."
            tactical_explanation = "Momento di massima pressione. Affidati a pattern ad alta percentuale, niente improvvisazione."
            risk_level = "LOW"
        else:
            tactical_call = "Chiudi pulito, non strafare."
            tactical_explanation = "Game point: cerca una chiusura pulita, senza forzare oltre il necessario."
            risk_level = "LOW"

    # LONG + sfavorevole -> evitare scambio lungo
    if rally_profile == "LONG" and regime == "UNFAVORABLE":
        tactical_call = "Spezza il ritmo. Evita scambi prolungati."
        tactical_explanation = "Negli scambi lunghi sei in sofferenza. Cerca una variazione rapida o prendi la rete appena possibile."
        risk_level = "HIGH"

    # SHORT + favorevole -> comandare subito
    if rally_profile == "SHORT" and regime == "FAVORABLE":
        tactical_call = "Comanda dal primo colpo."
        tactical_explanation = "Nei punti brevi stai dominando. Massimizza l'efficacia del servizio o del primo colpo in uscita per chiudere rapidamente."
        risk_level = "HIGH"

    # fallback se tactical_call non è stato ancora sovrascritto con qualcosa di specifico
    if tactical_call == "Costruisci il punto con pazienza.":
        if regime == "FAVORABLE":
            tactical_call = "Iniziativa e controllo."
            tactical_explanation = "Hai un leggero vantaggio, sfrutta il momento per prendere in mano lo scambio."
            risk_level = "MEDIUM"
        elif regime == "UNFAVORABLE":
            tactical_call = "Difesa attiva e contrattacco."
            tactical_explanation = "Sei leggermente sotto. Mantieni la profondità e attendi la palla giusta per ribaltare l'inerzia."
            risk_level = "LOW"

    suggestions.insert(0, tactical_call)

    # pattern reinforcement per dare suggerimenti ai fallback vecchi
    if pattern_id == 2:
        suggestions.append("Scenario favorevole a schema aggressivo su servizio: cerca subito campo aperto o vantaggio territoriale.")
    elif pattern_id in [5, 8]:
        suggestions.append("Scenario favorevole a pressione in risposta: anticipa, entra coi piedi e togli comfort all’avversario.")
    elif pattern_id == 4:
        suggestions.append("Contesto di protezione: riduci rischio e scegli una soluzione ad alta percentuale.")

    # de-dup
    unique_suggestions: List[str] = []
    for s in suggestions:
        if s not in unique_suggestions:
            unique_suggestions.append(s)

    details = unique_suggestions[:3]

    return {
        "headline": tactical_call,
        "confidence": tactical_confidence,
        "momentum_state": momentum_state,
        "serve_state": serve_state,
        "rally_profile": rally_profile,
        "pressure_state": pressure_state,
        "details": details,
        "tactical_explanation": tactical_explanation,
        "risk_level": risk_level,
    }
def analyze_history(recent_points: List[Dict[str, Any]]) -> Dict[str, str]:
    if not recent_points:
        return {
            "dominant_zone": "N/D (Pochi dati)",
            "vulnerability_zone": "N/D (Pochi dati)",
            "recommended_intent": "Costruire con ordine",
            "strategic_priority": "STABILIZE"
        }
        
    wins = {}
    losses = {}
    
    for pt in recent_points:
        pattern = pt.get("macroPattern") or "GENERIC"
        won = pt.get("isPointWon")
        if won == 1:
            wins[pattern] = wins.get(pattern, 0) + 1
        elif won == 0:
            losses[pattern] = losses.get(pattern, 0) + 1

    dominant = max(wins.items(), key=lambda x: x[1])[0] if wins else "Nessun dominio evidente"
    vulnerable = max(losses.items(), key=lambda x: x[1])[0] if losses else "Nessuna vulnerabilità grave"
    
    # Recommended intent
    intent = "Mantenere il piano attuale"
    if vulnerable in ["LONG_RALLY", "DEFENSE_RECOVERY"]:
        intent = "Abbreviare lo scambio e togliere tempo"
    elif vulnerable in ["SHORT_RALLY", "SERVE_DOMINANT", "AGGRESSIVE_RETURN"]:
        intent = "Allungare lo scambio, regolarità tecnica"
    elif dominant in ["NET_PLAY", "SHORT_BALL_ATTACK"]:
        intent = "Cercare la rete prima possibile"
        
    # Strategic priority
    total_pts = len(recent_points)
    win_rate = sum(wins.values()) / total_pts if total_pts > 0 else 0
    if win_rate < 0.4:
        priority = "PROTECT"
    elif win_rate > 0.6:
        priority = "EXPLOIT"
    else:
        if intent.startswith("Abbreviare"):
            priority = "DISRUPT"
        else:
            priority = "PRESS"
            
    return {
        "dominant_zone": dominant.replace("_", " ").title(),
        "vulnerability_zone": vulnerable.replace("_", " ").title(),
        "recommended_intent": intent,
        "strategic_priority": priority
    }

def build_tactical_payload_v3(base_payload: Dict[str, Any], recent_points: List[Dict[str, Any]]) -> Dict[str, Any]:
    hist_analysis = analyze_history(recent_points)
    
    call_v3 = base_payload["headline"]
    explanation_v3 = base_payload.get("tactical_explanation", "")
    
    summary = f"Rischio {base_payload.get('risk_level', 'MEDIUM')} - {base_payload.get('momentum_state', 'NEUTRAL')}"
    
    match_plan = f"Priorità temporanea: {hist_analysis['strategic_priority']}. Dominio su {hist_analysis['dominant_zone']}, attenzione a {hist_analysis['vulnerability_zone']}. Intento raccomandato: {hist_analysis['recommended_intent']}."
    
    return {
        "tactical_call_v3": call_v3,
        "tactical_summary_v3": summary,
        "tactical_rationale_v3": explanation_v3,
        "strategic_priority": hist_analysis['strategic_priority'],
        "match_plan": match_plan,
        "dominant_zone": hist_analysis['dominant_zone'],
        "vulnerability_zone": hist_analysis['vulnerability_zone'],
        "tactical_horizon": "Punto e breve termine" if len(recent_points) < 15 else "Lungo termine",
        "recommended_intent": hist_analysis['recommended_intent']
    }
