import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

from app.model_features import PATTERN_FEATURES


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "slam_all_features_with_patterns.csv"
MODEL_PATH = BASE_DIR / "pattern_model.pkl"
IMPORTANCE_PATH = BASE_DIR / "pattern_model_feature_importance.json"


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


def main():
    df = pd.read_csv(DATA_PATH)
    df = add_derived_features(df)

    target_col = "pattern_id_rule"
    if target_col not in df.columns:
        raise ValueError(f"Colonna target mancante: {target_col}")

    missing = [col for col in PATTERN_FEATURES if col not in df.columns]
    if missing:
        raise ValueError(f"Feature mancanti nel dataset: {missing}")

    X = df[PATTERN_FEATURES].fillna(0.0)
    y = df[target_col].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if y.nunique() > 1 else None,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_split=6,
        min_samples_leaf=3,
        random_state=42,
        class_weight="balanced_subsample",
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print("\n=== PATTERN CLASSIFICATION REPORT ===")
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")

    bundle = {
        "model": model,
        "features": PATTERN_FEATURES,
        "model_type": "RandomForestClassifier",
        "version": "2.0.0",
        "target": target_col,
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"\nPattern model salvato in: {MODEL_PATH}")

    importances = {
        feature: float(importance)
        for feature, importance in zip(PATTERN_FEATURES, model.feature_importances_)
    }
    importances = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))

    with open(IMPORTANCE_PATH, "w", encoding="utf-8") as f:
        json.dump(importances, f, indent=2, ensure_ascii=False)

    print(f"Feature importance salvate in: {IMPORTANCE_PATH}")


if __name__ == "__main__":
    main()