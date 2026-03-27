from typing import Dict, Any

from app.services.feature_builder import build_live_row, build_model_frame
from app.services.win_model import predict_win_probability
from app.services.pattern_engine import build_pattern_payload
from app.services.tactical_engine import (
    build_next_point_hint,
    build_point_description,
    build_tagged_pattern_name,
    build_tactical_payload,
)
from app.model_features import WIN_FEATURES


def analyze_live_point(payload: Dict[str, Any]) -> Dict[str, Any]:
    row = build_live_row(payload)
    X = build_model_frame(row, WIN_FEATURES)

    prediction, point_win_probability = predict_win_probability(X)
    pattern_data = build_pattern_payload(row, point_win_probability)

    fused_pattern = pattern_data["pattern_fused"]

    tactical_payload = build_tactical_payload(
        row,
        point_win_probability,
        fused_pattern["pattern_id"],
    )

    next_point_pattern_hint = build_next_point_hint(
        fused_pattern["pattern_id"],
        row["is_player_on_serve"],
    )

    tagged_pattern = build_tagged_pattern_name(payload.get("tag", {}))
    point_description = build_point_description(
        row,
        point_win_probability,
        fused_pattern["pattern_name"],
        tactical_payload["momentum_state"],
        tactical_payload["rally_profile"],
        tactical_payload["pressure_state"],
    )

    return {
        "point_win_probability": point_win_probability,
        "prediction": prediction,
        "pattern_rule": pattern_data["pattern_rule"],
        "pattern_ml": pattern_data["pattern_ml"],
        "pattern_fused": fused_pattern,

        # compatibilità frontend attuale
        "tactical_suggestion": tactical_payload["details"],

        "quick_stats": {
            "pct_service_points_won": row["pct_service_points_won"],
            "pct_return_points_won": row["pct_return_points_won"],
            "pct_first_serve_points_won": row["pct_first_serve_points_won"],
            "pct_second_serve_points_won": row["pct_second_serve_points_won"],
        },
        "tagged_pattern": tagged_pattern,
        "point_description": point_description,
        "next_point_pattern_hint": next_point_pattern_hint,

        # nuovi campi V3-like
        "tactical_call": tactical_payload["headline"],
        "tactical_confidence": tactical_payload["confidence"],
        "momentum_state": tactical_payload["momentum_state"],
        "serve_state": tactical_payload["serve_state"],
        "rally_profile": tactical_payload["rally_profile"],
        "pressure_state": tactical_payload["pressure_state"],
    }