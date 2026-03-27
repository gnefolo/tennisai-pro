from typing import Dict, Any
import pandas as pd


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


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def build_live_row(payload: Dict[str, Any]) -> Dict[str, Any]:
    stats = payload.get("stats", {}) or {}
    flags = payload.get("flags", {}) or {}
    tag = payload.get("tag", {}) or {}

    rally_count_raw = payload.get("rally_count")
    rally_missing = 1 if rally_count_raw is None else 0
    rally_count = safe_int(rally_count_raw, 4)

    if rally_count <= 3:
        rally_bucket_num = 0
    elif rally_count <= 7:
        rally_bucket_num = 1
    else:
        rally_bucket_num = 2

    row = {
        "SetNo": safe_int(payload.get("set"), 1),
        "GameNo": safe_int(payload.get("game"), 1),
        "PointNumber": safe_int(payload.get("point_number"), 1),
        "P1GamesWon": 0,
        "P2GamesWon": 0,
        "ServeNumber": safe_int(payload.get("serve_number"), 1),
        "RallyCount": rally_count,
        "rally_missing": rally_missing,
        "rally_bucket_num": rally_bucket_num,
        "is_player_on_serve": safe_int(payload.get("is_on_serve"), 0),
        "service_points_played": 0,
        "service_points_won": 0,
        "pct_service_points_won": clamp01(safe_float(stats.get("pctServicePointsWon"), 0.0)),
        "return_points_played": 0,
        "return_points_won": 0,
        "pct_return_points_won": clamp01(safe_float(stats.get("pctReturnPointsWon"), 0.0)),
        "first_serve_points_played": 0,
        "first_serve_points_won_cum": 0,
        "pct_first_serve_points_won": clamp01(safe_float(stats.get("pctFirstServePointsWon"), 0.0)),
        "second_serve_points_played": 0,
        "second_serve_points_won_cum": 0,
        "pct_second_serve_points_won": clamp01(safe_float(stats.get("pctSecondServePointsWon"), 0.0)),
        "last_n_points_won_5": clamp01(safe_float(stats.get("momentumLast5"), 0.0)),
        "is_game_point": 1 if flags.get("isGamePoint") else 0,
        "is_break_point": 1 if flags.get("isBreakPoint") else 0,
        "is_game_point_against": 1 if flags.get("isGamePointAgainst") else 0,
        "serve_direction": tag.get("serve_direction"),
        "serve_quality": tag.get("serve_quality"),
        "return_type": tag.get("return_type"),
        "rally_bucket": tag.get("rally_bucket"),
        "rally_phase": tag.get("rally_phase"),
        "key_event": tag.get("key_event"),
        "finish_type": tag.get("finish_type"),
        "finish_shot": tag.get("finish_shot"),
        "point_outcome": tag.get("point_outcome"),
    }

    row["score_pressure_index"] = (
        row["is_break_point"] * 2
        + row["is_game_point"]
        + row["is_game_point_against"] * 2
    )
    row["serve_advantage"] = row["pct_service_points_won"] - row["pct_return_points_won"]
    row["first_second_gap"] = row["pct_first_serve_points_won"] - row["pct_second_serve_points_won"]
    row["momentum_trend"] = row["last_n_points_won_5"] - 0.5

    return row


def build_model_frame(row: Dict[str, Any], feature_cols: list[str]) -> pd.DataFrame:
    data = {}
    for col in feature_cols:
        data[col] = safe_float(row.get(col, 0.0), 0.0)
    return pd.DataFrame([data])

def clean_features(df):
    df = df.copy()

    # ===== FIX RALLY COUNT =====
    df["rally_missing"] = df["RallyCount"].isna().astype(int)
    df["RallyCount"] = df["RallyCount"].fillna(4)

    df["rally_bucket_num"] = df["RallyCount"].apply(bucket_rally)

    return df

def bucket_rally(x):
    if x <= 3:
        return 0  # short
    elif x <= 7:
        return 1  # medium
    else:
        return 2  # long