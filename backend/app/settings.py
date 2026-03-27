from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

TACTICAL_MODEL_PATH = BASE_DIR / "tactical_model_xgb.pkl"
PATTERN_MODEL_PATH = BASE_DIR / "pattern_model.pkl"