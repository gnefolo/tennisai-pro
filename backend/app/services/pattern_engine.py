from functools import lru_cache
from typing import Dict, Any, Optional, Tuple
import joblib

from app.settings import PATTERN_MODEL_PATH


PATTERN_NAMES = {
    1: "Serve safe / percentage",
    2: "Serve aggressive",
    3: "Serve neutral / mixed",
    4: "Serve defensive under pressure",
    5: "Aggressive return",
    6: "Safe return",
    7: "Neutral return",
    8: "Return pressure",
}


def safe_float(val: Any, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default


def safe_int(val: Any, default: int = 0) -> int:
    try:
        if val is None:
            return default
        return int(val)
    except (TypeError, ValueError):
        return default


@lru_cache(maxsize=1)
def load_pattern_bundle():
    bundle = joblib.load(PATTERN_MODEL_PATH)
    model = bundle["model"]
    features = bundle["features"]
    return model, features


def compute_pressure_level(row: Dict[str, Any]) -> str:
    if (
        row.get("is_break_point", 0) == 1
        or row.get("is_game_point", 0) == 1
        or row.get("is_game_point_against", 0) == 1
    ):
        return "high"

    if safe_int(row.get("SetNo"), 1) >= 3 and safe_int(row.get("GameNo"), 1) >= 8:
        return "medium"

    return "low"


def classify_pattern_rule(row: Dict[str, Any], proba: float) -> int:
    is_on_serve = safe_int(row.get("is_player_on_serve", 0), 0)
    serve_no = safe_int(row.get("ServeNumber", 1), 1)
    pct_1st = safe_float(row.get("pct_first_serve_points_won", 0.0))
    pct_2nd = safe_float(row.get("pct_second_serve_points_won", 0.0))
    pct_sv = safe_float(row.get("pct_service_points_won", 0.0))
    pct_rt = safe_float(row.get("pct_return_points_won", 0.0))
    mom5 = safe_float(row.get("last_n_points_won_5", 0.0))
    is_bp = safe_int(row.get("is_break_point", 0), 0)
    is_gp_against = safe_int(row.get("is_game_point_against", 0), 0)

    if is_on_serve == 1:
        if pct_1st < 0.60 or pct_2nd < 0.45 or mom5 < 0.40 or is_bp == 1 or is_gp_against == 1:
            return 1
        if serve_no == 1 and pct_1st > 0.70 and pct_sv > 0.65 and mom5 > 0.55 and proba > 0.60 and is_bp == 0:
            return 2
        if 0.58 <= pct_sv <= 0.68 and 0.40 <= mom5 <= 0.60:
            return 3
        if is_bp == 1 and mom5 < 0.50:
            return 4
        return 3

    if is_bp == 1 and pct_rt >= 0.32 and mom5 >= 0.45 and proba >= 0.50:
        return 5
    if pct_rt < 0.30 or mom5 < 0.40 or proba < 0.45:
        return 6
    if 0.30 <= pct_rt <= 0.38 and 0.40 <= mom5 <= 0.60:
        return 7
    if pct_rt > 0.38 and mom5 > 0.55 and proba > 0.55:
        return 8

    return 7


def predict_pattern_ml(row: Dict[str, Any]) -> Tuple[Optional[int], Optional[float]]:
    model, features = load_pattern_bundle()
    x = [[safe_float(row.get(col, 0.0), 0.0) for col in features]]
    pred = int(model.predict(x)[0])
    conf = float(model.predict_proba(x)[0].max())
    return pred, conf


def fuse_patterns(
    rule_id: int,
    ml_id: Optional[int],
    ml_conf: Optional[float],
    row: Dict[str, Any],
) -> Tuple[int, str]:
    pressure = compute_pressure_level(row)

    if ml_id is None or ml_conf is None:
        return rule_id, "Rule only"

    if ml_id == rule_id:
        return rule_id, "Rule and ML aligned"

    if pressure == "high":
        return rule_id, "High pressure: prefer rules"

    if pressure == "low" and ml_conf >= 0.70:
        return ml_id, "Low pressure and confident ML"

    if pressure == "medium" and ml_conf >= 0.80:
        return ml_id, "Medium pressure and strong ML confidence"

    return rule_id, "Fallback to tactical rules"


def build_pattern_payload(row: Dict[str, Any], proba: float) -> Dict[str, Any]:
    rule_id = classify_pattern_rule(row, proba)
    ml_id, ml_conf = predict_pattern_ml(row)
    fused_id, explanation = fuse_patterns(rule_id, ml_id, ml_conf, row)

    pattern_rule = {
        "pattern_id": rule_id,
        "pattern_name": PATTERN_NAMES.get(rule_id, f"Pattern {rule_id}"),
        "confidence": None,
        "explanation": "Rule-based tactical classification",
    }

    pattern_ml = None
    if ml_id is not None:
        pattern_ml = {
            "pattern_id": ml_id,
            "pattern_name": PATTERN_NAMES.get(ml_id, f"Pattern {ml_id}"),
            "confidence": ml_conf,
            "explanation": "ML pattern classifier",
        }

    pattern_fused = {
        "pattern_id": fused_id,
        "pattern_name": PATTERN_NAMES.get(fused_id, f"Pattern {fused_id}"),
        "confidence": ml_conf if fused_id == ml_id else None,
        "explanation": explanation,
    }

    return {
        "pattern_rule": pattern_rule,
        "pattern_ml": pattern_ml,
        "pattern_fused": pattern_fused,
    }