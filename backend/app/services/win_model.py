from functools import lru_cache
import joblib

from app.settings import TACTICAL_MODEL_PATH


@lru_cache(maxsize=1)
def load_win_bundle():
    return joblib.load(TACTICAL_MODEL_PATH)


def predict_win_probability(df):
    bundle = load_win_bundle()
    model = bundle["model"]
    prediction = int(model.predict(df)[0])
    probability = float(model.predict_proba(df)[0, 1])
    
    metadata = {
        "version": bundle.get("version", "unknown"),
        "model_type": bundle.get("model_type", "unknown"),
        "calibration_method": bundle.get("calibration_method", "none"),
        "split_type": bundle.get("split_type", "unknown"),
        "brier_score": bundle.get("calibrated_metrics", {}).get("brier_score"),
        "accuracy": bundle.get("calibrated_metrics", {}).get("accuracy"),
        "roc_auc": bundle.get("calibrated_metrics", {}).get("roc_auc"),
    }
    
    return prediction, probability, metadata