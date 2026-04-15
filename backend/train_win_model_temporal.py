import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    classification_report,
    roc_auc_score,
)
from xgboost import XGBClassifier

from app.model_features import WIN_FEATURES


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "slam_all_features.csv"
MODEL_PATH = BASE_DIR / "tactical_model_xgb_temporal.pkl"
REPORT_PATH = BASE_DIR / "tactical_model_xgb_temporal_report.json"


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["rally_missing"] = df["RallyCount"].isna().astype(int)
    df["RallyCount"] = df["RallyCount"].fillna(4)

    def bucket_rally(x):
        if x <= 3:
            return 0
        elif x <= 7:
            return 1
        return 2

    df["rally_bucket_num"] = df["RallyCount"].apply(bucket_rally)

    df["score_pressure_index"] = (
        df["is_break_point"].fillna(0) * 2
        + df["is_game_point"].fillna(0) * 1.5
        + df["is_game_point_against"].fillna(0) * 2.5
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


def temporal_match_split(df: pd.DataFrame, test_ratio: float = 0.2):
    ordered = df.sort_values(["match_id", "SetNo", "GameNo", "PointNumber"]).reset_index(drop=True)

    unique_matches = ordered["match_id"].dropna().unique().tolist()
    split_idx = int(len(unique_matches) * (1 - test_ratio))

    train_matches = set(unique_matches[:split_idx])
    test_matches = set(unique_matches[split_idx:])

    train_df = ordered[ordered["match_id"].isin(train_matches)].copy()
    test_df = ordered[ordered["match_id"].isin(test_matches)].copy()

    return train_df, test_df


def evaluate_model(name, model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
        "brier_score": float(brier_score_loss(y_test, y_prob)),
        "classification_report": classification_report(y_test, y_pred, output_dict=True),
    }

    print(f"\n=== {name} ===")
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"ROC AUC: {metrics['roc_auc']:.4f}")
    print(f"Brier Score: {metrics['brier_score']:.4f}")

    return metrics


def main():
    print("\nLoading dataset...")
    df = pd.read_csv(DATA_PATH)
    df = add_derived_features(df)

    missing = [col for col in WIN_FEATURES if col not in df.columns]
    if missing:
        raise ValueError(f"Feature mancanti dopo feature engineering: {missing}")

    train_df, test_df = temporal_match_split(df, test_ratio=0.2)

    print(f"Total rows: {len(df)}")
    print(f"Train rows: {len(train_df)}")
    print(f"Test rows: {len(test_df)}")
    print(f"Train matches: {train_df['match_id'].nunique()}")
    print(f"Test matches: {test_df['match_id'].nunique()}")

    X_train = train_df[WIN_FEATURES].fillna(0.0)
    y_train = train_df["point_won"].astype(int)

    X_test = test_df[WIN_FEATURES].fillna(0.0)
    y_test = test_df["point_won"].astype(int)

    base_model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
    )

    print("\nTraining base XGBoost model on temporal split...")
    base_model.fit(X_train, y_train)

    base_metrics = evaluate_model("TEMPORAL BASE XGBOOST", base_model, X_test, y_test)

    print("\nCalibrating temporal model with isotonic regression...")
    calibrated_model = CalibratedClassifierCV(
        estimator=base_model,
        method="isotonic",
        cv="prefit",
    )
    calibrated_model.fit(X_train, y_train)

    calibrated_metrics = evaluate_model(
        "TEMPORAL CALIBRATED XGBOOST", calibrated_model, X_test, y_test
    )

    bundle = {
        "model": calibrated_model,
        "base_model_type": "XGBClassifier",
        "model_type": "CalibratedClassifierCV",
        "calibration_method": "isotonic",
        "features": WIN_FEATURES,
        "version": "2.3.0",
        "target": "point_won",
        "split_type": "temporal_match_split",
        "base_metrics": base_metrics,
        "calibrated_metrics": calibrated_metrics,
    }

    joblib.dump(bundle, MODEL_PATH)
    print(f"\nTemporal calibrated model saved to: {MODEL_PATH}")

    report = {
        "split_type": "temporal_match_split",
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "train_matches": int(train_df["match_id"].nunique()),
        "test_matches": int(test_df["match_id"].nunique()),
        "base_metrics": base_metrics,
        "calibrated_metrics": calibrated_metrics,
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"Temporal report saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()