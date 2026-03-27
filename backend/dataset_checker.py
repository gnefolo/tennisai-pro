from pathlib import Path
import json
import numpy as np
import pandas as pd

from app.model_features import WIN_FEATURES, PATTERN_FEATURES


BASE_DIR = Path(__file__).resolve().parent
WIN_DATA_PATH = BASE_DIR / "slam_all_features.csv"
PATTERN_DATA_PATH = BASE_DIR / "slam_all_features_with_patterns.csv"

REPORT_PATH = BASE_DIR / "dataset_quality_report.json"


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["score_pressure_index"] = (
        df["is_break_point"].fillna(0) * 2
        + df["is_game_point"].fillna(0)
        + df["is_game_point_against"].fillna(0) * 2
    )

    df["serve_advantage"] = (
        df["pct_service_points_won"].fillna(0.0)
        - df["pct_return_points_won"].fillna(0.0)
    )

    df["first_second_gap"] = (
        df["pct_first_serve_points_won"].fillna(0.0)
        - df["pct_second_serve_points_won"].fillna(0.0)
    )

    df["momentum_trend"] = df["last_n_points_won_5"].fillna(0.0) - 0.5
    return df


def safe_value_counts(series: pd.Series, top_n: int = 10) -> dict:
    vc = series.value_counts(dropna=False).head(top_n)
    out = {}
    for k, v in vc.items():
        out[str(k)] = int(v)
    return out


def numeric_summary(df: pd.DataFrame, cols: list[str]) -> dict:
    out = {}
    for col in cols:
        if col not in df.columns:
            continue
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue

        s = df[col].replace([np.inf, -np.inf], np.nan)
        out[col] = {
            "min": None if s.dropna().empty else float(s.min()),
            "max": None if s.dropna().empty else float(s.max()),
            "mean": None if s.dropna().empty else float(s.mean()),
            "std": None if s.dropna().empty else float(s.std()) if len(s.dropna()) > 1 else 0.0,
            "missing_pct": float(s.isna().mean()),
        }
    return out


def find_constant_features(df: pd.DataFrame, cols: list[str]) -> list[str]:
    constants = []
    for col in cols:
        if col in df.columns and df[col].nunique(dropna=False) <= 1:
            constants.append(col)
    return constants


def find_high_missing(df: pd.DataFrame, cols: list[str], threshold: float = 0.20) -> dict:
    result = {}
    for col in cols:
        if col in df.columns:
            pct = float(df[col].isna().mean())
            if pct >= threshold:
                result[col] = pct
    return result


def find_non_numeric_expected(df: pd.DataFrame, cols: list[str]) -> list[str]:
    bad = []
    for col in cols:
        if col in df.columns and not pd.api.types.is_numeric_dtype(df[col]):
            bad.append(col)
    return bad


def find_high_correlations(df: pd.DataFrame, cols: list[str], threshold: float = 0.98) -> list[dict]:
    usable = [c for c in cols if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    if len(usable) < 2:
        return []

    corr = df[usable].corr(numeric_only=True).abs()
    pairs = []
    seen = set()

    for i, c1 in enumerate(usable):
        for c2 in usable[i + 1:]:
            val = corr.loc[c1, c2]
            if pd.notna(val) and val >= threshold:
                key = tuple(sorted((c1, c2)))
                if key not in seen:
                    seen.add(key)
                    pairs.append({
                        "feature_1": c1,
                        "feature_2": c2,
                        "correlation": float(val),
                    })
    return sorted(pairs, key=lambda x: x["correlation"], reverse=True)


def leakage_checks(df: pd.DataFrame, target_col: str) -> list[str]:
    warnings = []

    if target_col not in df.columns:
        warnings.append(f"Target {target_col} mancante.")
        return warnings

    if target_col == "point_won":
        suspicious = [
            "service_points_won",
            "return_points_won",
        ]
        for col in suspicious:
            if col in df.columns:
                warnings.append(
                    f"Controllare leakage potenziale: {col} potrebbe incorporare informazione cumulata post-punto se calcolata male."
                )

    if target_col == "pattern_id_rule":
        warnings.append(
            "Il target pattern_id_rule è pseudo-label rule-based: accuracy molto alta è attesa e non misura vera generalizzazione semantica."
        )

    return warnings


def basic_range_checks(df: pd.DataFrame) -> dict:
    checks = {}

    bounded_01 = [
        "pct_service_points_won",
        "pct_return_points_won",
        "pct_first_serve_points_won",
        "pct_second_serve_points_won",
        "last_n_points_won_5",
    ]

    for col in bounded_01:
        if col in df.columns:
            invalid = int(((df[col] < 0) | (df[col] > 1)).fillna(False).sum())
            checks[col] = {
                "outside_0_1_count": invalid
            }

    if "ServeNumber" in df.columns:
        invalid = int((~df["ServeNumber"].isin([1, 2])).fillna(False).sum())
        checks["ServeNumber"] = {"invalid_values_count": invalid}

    if "is_player_on_serve" in df.columns:
        invalid = int((~df["is_player_on_serve"].isin([0, 1])).fillna(False).sum())
        checks["is_player_on_serve"] = {"invalid_values_count": invalid}

    return checks


def build_report(df: pd.DataFrame, feature_cols: list[str], target_col: str, dataset_name: str) -> dict:
    df = add_derived_features(df)

    missing_features = [c for c in feature_cols if c not in df.columns]
    present_features = [c for c in feature_cols if c in df.columns]

    report = {
        "dataset": dataset_name,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "target_col": target_col,
        "target_distribution": safe_value_counts(df[target_col]) if target_col in df.columns else {},
        "missing_features": missing_features,
        "constant_features": find_constant_features(df, present_features),
        "high_missing_features": find_high_missing(df, present_features, threshold=0.20),
        "non_numeric_expected_features": find_non_numeric_expected(df, present_features),
        "range_checks": basic_range_checks(df),
        "numeric_summary": numeric_summary(df, present_features),
        "high_correlations": find_high_correlations(df, present_features, threshold=0.98)[:25],
        "leakage_warnings": leakage_checks(df, target_col),
    }

    return report


def main():
    win_df = pd.read_csv(WIN_DATA_PATH)
    pattern_df = pd.read_csv(PATTERN_DATA_PATH)

    win_report = build_report(
        df=win_df,
        feature_cols=WIN_FEATURES,
        target_col="point_won",
        dataset_name="slam_all_features.csv",
    )

    pattern_report = build_report(
        df=pattern_df,
        feature_cols=PATTERN_FEATURES,
        target_col="pattern_id_rule",
        dataset_name="slam_all_features_with_patterns.csv",
    )

    full_report = {
        "win_dataset": win_report,
        "pattern_dataset": pattern_report,
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2, ensure_ascii=False)

    print("\n=== DATASET CHECK COMPLETATO ===")
    print(f"Report salvato in: {REPORT_PATH}")

    print("\n--- WIN DATASET ---")
    print(f"Rows: {win_report['rows']}")
    print(f"Missing features: {win_report['missing_features']}")
    print(f"Constant features: {win_report['constant_features']}")
    print(f"High missing features: {win_report['high_missing_features']}")
    print(f"Non numeric expected features: {win_report['non_numeric_expected_features']}")
    print(f"Leakage warnings: {win_report['leakage_warnings']}")

    print("\n--- PATTERN DATASET ---")
    print(f"Rows: {pattern_report['rows']}")
    print(f"Missing features: {pattern_report['missing_features']}")
    print(f"Constant features: {pattern_report['constant_features']}")
    print(f"High missing features: {pattern_report['high_missing_features']}")
    print(f"Non numeric expected features: {pattern_report['non_numeric_expected_features']}")
    print(f"Leakage warnings: {pattern_report['leakage_warnings']}")


if __name__ == "__main__":
    main()