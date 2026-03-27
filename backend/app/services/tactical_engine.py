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
    confidence = confidence_band(proba)

    suggestions: List[str] = []

    # ===== pressure first =====
    if pressure_state == "GAME_POINT_AGAINST":
        suggestions.append(
            "Punto delicato: proteggi il margine, evita rischio gratuito e cerca una costruzione affidabile."
        )
    elif pressure_state == "BREAK_POINT_AGAINST":
        suggestions.append(
            "Palla break contro: alza la percentuale sulla prima o gioca una seconda molto solida sul piano tattico."
        )
    elif pressure_state == "BREAK_POINT_FOR":
        suggestions.append(
            "Palla break a favore: entra aggressivo in risposta e togli tempo all’avversario fin dal primo colpo."
        )
    elif pressure_state == "GAME_POINT_FOR":
        suggestions.append(
            "Game point: cerca una chiusura pulita, senza forzare oltre il necessario."
        )

    # ===== serve / return state =====
    if serve_state == "SERVING_FIRST":
        suggestions.append(
            "Sfrutta la prima: costruisci per chiudere entro i primi due colpi se ricevi palla neutra."
        )
    elif serve_state == "SERVING_SECOND":
        suggestions.append(
            "Zona ad alto rischio: sulla seconda privilegia profondità, margine e posizione, evitando fretta tattica."
        )
    else:
        suggestions.append(
            "In risposta lavora sulla profondità iniziale e prova a neutralizzare subito il primo vantaggio avversario."
        )

    # ===== momentum =====
    if momentum_state == "HOT":
        suggestions.append(
            "Momento positivo: mantieni pressione e inerzia senza cambiare piano inutilmente."
        )
    elif momentum_state == "COLD":
        suggestions.append(
            "Momento negativo: stabilizza lo scambio, alza qualità media e interrompi subito il run avversario."
        )
    else:
        suggestions.append(
            "Situazione equilibrata: fai prevalere esecuzione pulita e disciplina tattica."
        )

    # ===== rally profile =====
    if rally_profile == "SHORT":
        suggestions.append(
            "Punti brevi dominanti: conta moltissimo la qualità del primo impatto, servizio o risposta."
        )
    elif rally_profile == "LONG":
        suggestions.append(
            "Scambio lungo atteso: prima di accelerare costruisci ordine, profondità e posizione."
        )

    # ===== pattern reinforcement =====
    if pattern_id == 2:
        suggestions.append(
            "Scenario favorevole a schema aggressivo su servizio: cerca subito campo aperto o vantaggio territoriale."
        )
    elif pattern_id in [5, 8]:
        suggestions.append(
            "Scenario favorevole a pressione in risposta: anticipa, entra coi piedi e togli comfort all’avversario."
        )
    elif pattern_id == 4:
        suggestions.append(
            "Contesto di protezione: riduci rischio e scegli una soluzione ad alta percentuale."
        )

    # de-dup e top 3
    unique_suggestions: List[str] = []
    for s in suggestions:
        if s not in unique_suggestions:
            unique_suggestions.append(s)

    headline = unique_suggestions[0] if unique_suggestions else "Gestisci il punto con ordine tattico."
    details = unique_suggestions[:3]

    return {
        "headline": headline,
        "confidence": confidence,
        "momentum_state": momentum_state,
        "serve_state": serve_state,
        "rally_profile": rally_profile,
        "pressure_state": pressure_state,
        "details": details,
    }