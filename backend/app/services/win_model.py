from functools import lru_cache
import joblib

from app.settings import TACTICAL_MODEL_PATH


@lru_cache(maxsize=1)
def load_win_bundle():
    bundle = joblib.load(TACTICAL_MODEL_PATH)
    model = bundle["model"]
    features = bundle["features"]
    return model, features


def predict_win_probability(df):
    model, _ = load_win_bundle()
    prediction = int(model.predict(df)[0])
    probability = float(model.predict_proba(df)[0, 1])
    return prediction, probability