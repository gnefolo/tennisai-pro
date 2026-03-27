import pandas as pd
from pathlib import Path
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

from xgboost import XGBClassifier

from app.model_features import WIN_FEATURES

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "slam_all_features.csv"
MODEL_PATH = BASE_DIR / "tactical_model_xgb.pkl"


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # rally missing flag
    df["rally_missing"] = df["RallyCount"].isna().astype(int)

    # imputazione rally count
    df["RallyCount"] = df["RallyCount"].fillna(4)

    # bucket rally
    def bucket_rally(x):
        if x <= 3:
            return 0
        elif x <= 7:
            return 1
        return 2

    df["rally_bucket_num"] = df["RallyCount"].apply(bucket_rally)

    # feature derivate V2
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


def load_data():
    df = pd.read_csv(DATA_PATH)
    df = add_derived_features(df)
    return df


def main():
    df = load_data()

    missing = [col for col in WIN_FEATURES if col not in df.columns]
    if missing:
        raise ValueError(f"Feature mancanti dopo feature engineering: {missing}")

    X = df[WIN_FEATURES].fillna(0.0)
    y = df["point_won"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y if y.nunique() > 1 else None,
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
    )

    print("\nTraining XGBoost...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n=== CLASSIFICATION REPORT ===")
    print(classification_report(y_test, y_pred))

    auc = roc_auc_score(y_test, y_prob)
    print(f"\nROC AUC: {auc:.4f}")

    bundle = {
        "model": model,
        "features": WIN_FEATURES,
        "model_type": "XGBClassifier",
        "version": "2.1.0",
        "target": "point_won",
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"\nModello salvato in: {MODEL_PATH}")


if __name__ == "__main__":
    main()