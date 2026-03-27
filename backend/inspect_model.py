import joblib
import pandas as pd

MODEL_PATH = "tactical_model_xgb.pkl"

bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
features = bundle["features"]

importances = model.feature_importances_

df = pd.DataFrame({
    "feature": features,
    "importance": importances
}).sort_values(by="importance", ascending=False)

print("\n=== FEATURE IMPORTANCE ===")
print(df)