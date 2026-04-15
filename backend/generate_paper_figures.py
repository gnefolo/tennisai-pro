import json
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import auc, roc_curve

from app.model_features import WIN_FEATURES


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "slam_all_features.csv"
MODEL_PATH = BASE_DIR / "tactical_model_xgb_temporal.pkl"

ROC_FIG_PATH = BASE_DIR / "paper_figure_roc_curve.png"
CALIB_FIG_PATH = BASE_DIR / "paper_figure_calibration_curve.png"
FEAT_FIG_PATH = BASE_DIR / "paper_figure_feature_importance.png"
REPORT_PATH = BASE_DIR / "paper_figures_report.json"


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


def save_roc_curve(y_true, y_prob):
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    roc_auc = auc(fpr, tpr)

    plt.figure(figsize=(7, 5))
    plt.plot(fpr, tpr, linewidth=2, label=f"Model ROC (AUC = {roc_auc:.4f})")
    plt.plot([0, 1], [0, 1], linestyle="--", linewidth=1.5, label="Random")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve - Temporal Test Set")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(ROC_FIG_PATH, dpi=300, bbox_inches="tight")
    plt.close()

    return roc_auc


def save_calibration_curve(y_true, y_prob, n_bins: int = 10):
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="quantile")

    plt.figure(figsize=(7, 5))
    plt.plot(prob_pred, prob_true, marker="o", linewidth=2, label="Calibrated model")
    plt.plot([0, 1], [0, 1], linestyle="--", linewidth=1.5, label="Perfect calibration")
    plt.xlabel("Predicted Probability")
    plt.ylabel("Observed Frequency")
    plt.title("Calibration Curve - Temporal Test Set")
    plt.legend(loc="upper left")
    plt.tight_layout()
    plt.savefig(CALIB_FIG_PATH, dpi=300, bbox_inches="tight")
    plt.close()

    return {
        "prob_pred": [float(x) for x in prob_pred],
        "prob_true": [float(x) for x in prob_true],
    }


def save_feature_importance(bundle):
    model = bundle["model"]

    # model is calibrated; estimator is the prefit XGBoost inside calibrated_classifiers_
    # sklearn stores calibrated submodels in calibrated_classifiers_
    base_estimator = None

    if hasattr(model, "calibrated_classifiers_") and len(model.calibrated_classifiers_) > 0:
        calibrated_obj = model.calibrated_classifiers_[0]
        if hasattr(calibrated_obj, "estimator"):
            base_estimator = calibrated_obj.estimator

    if base_estimator is None:
        raise ValueError("Impossibile recuperare il modello XGBoost base dal modello calibrato.")

    importances = base_estimator.feature_importances_
    features = bundle["features"]

    feat_df = pd.DataFrame({
        "feature": features,
        "importance": importances,
    }).sort_values("importance", ascending=False)

    top_df = feat_df.head(10).sort_values("importance", ascending=True)

    plt.figure(figsize=(8, 5.5))
    plt.barh(top_df["feature"], top_df["importance"])
    plt.xlabel("Gain-based Importance")
    plt.ylabel("Feature")
    plt.title("Top 10 Feature Importances")
    plt.tight_layout()
    plt.savefig(FEAT_FIG_PATH, dpi=300, bbox_inches="tight")
    plt.close()

    return feat_df


def main():
    print("\nLoading dataset...")
    df = pd.read_csv(DATA_PATH)
    df = add_derived_features(df)

    missing = [col for col in WIN_FEATURES if col not in df.columns]
    if missing:
        raise ValueError(f"Feature mancanti dopo feature engineering: {missing}")

    print("Applying temporal split...")
    _, test_df = temporal_match_split(df, test_ratio=0.2)

    X_test = test_df[WIN_FEATURES].fillna(0.0)
    y_test = test_df["point_won"].astype(int)

    print("Loading calibrated temporal model...")
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]

    print("Generating predictions...")
    y_prob = model.predict_proba(X_test)[:, 1]

    print("Saving ROC figure...")
    roc_auc = save_roc_curve(y_test, y_prob)

    print("Saving calibration figure...")
    calib_data = save_calibration_curve(y_test, y_prob, n_bins=10)

    print("Saving feature importance figure...")
    feat_df = save_feature_importance(bundle)

    report = {
        "roc_auc_from_curve": float(roc_auc),
        "test_rows": int(len(test_df)),
        "test_matches": int(test_df["match_id"].nunique()),
        "top_10_features": feat_df.head(10).to_dict(orient="records"),
        "calibration_curve": calib_data,
        "files": {
            "roc_curve": str(ROC_FIG_PATH),
            "calibration_curve": str(CALIB_FIG_PATH),
            "feature_importance": str(FEAT_FIG_PATH),
        },
    }

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\nDone.")
    print(f"ROC curve: {ROC_FIG_PATH}")
    print(f"Calibration curve: {CALIB_FIG_PATH}")
    print(f"Feature importance: {FEAT_FIG_PATH}")
    print(f"Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()