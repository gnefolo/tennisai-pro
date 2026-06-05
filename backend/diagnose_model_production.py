"""
TennisAI Pro — Diagnostica completa del modello in produzione.

Questo script esegue:
1. Verifica del bundle .pkl caricato (metadati, tipo modello, features)
2. Feature Importance dal modello base XGBoost sottostante
3. Ri-valutazione sul test set temporale (Accuracy, ROC AUC, Brier Score)
4. Analisi della distribuzione delle probabilità predette
5. Analisi di calibrazione (binned)
6. Confronto predizioni su scenari estremi (dominante vs. equilibrato)
7. Verifica di correlazione perfetta last_n_points_won_5 ↔ momentum_trend
8. Cross-Validation temporale (time-series 5-fold)
"""

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)

# Paths
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "tactical_model_xgb_temporal.pkl"
DATA_PATH = BASE_DIR / "slam_all_features_fixed.csv"
REPORT_OUTPUT = BASE_DIR / "production_model_diagnostic.json"

sys.path.insert(0, str(BASE_DIR))
from app.model_features import WIN_FEATURES


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


def analyze_probability_distribution(y_prob):
    """Analisi della distribuzione delle probabilità predette."""
    return {
        "min": float(np.min(y_prob)),
        "max": float(np.max(y_prob)),
        "mean": float(np.mean(y_prob)),
        "median": float(np.median(y_prob)),
        "std": float(np.std(y_prob)),
        "pct_below_0.1": float(np.mean(y_prob < 0.1) * 100),
        "pct_0.1_to_0.3": float(np.mean((y_prob >= 0.1) & (y_prob < 0.3)) * 100),
        "pct_0.3_to_0.5": float(np.mean((y_prob >= 0.3) & (y_prob < 0.5)) * 100),
        "pct_0.5_to_0.7": float(np.mean((y_prob >= 0.5) & (y_prob < 0.7)) * 100),
        "pct_0.7_to_0.9": float(np.mean((y_prob >= 0.7) & (y_prob < 0.9)) * 100),
        "pct_above_0.9": float(np.mean(y_prob >= 0.9) * 100),
    }


def calibration_analysis(y_true, y_prob, n_bins=10):
    """Analisi di calibrazione per bins."""
    bins = np.linspace(0, 1, n_bins + 1)
    results = []
    for i in range(n_bins):
        mask = (y_prob >= bins[i]) & (y_prob < bins[i + 1])
        if mask.sum() == 0:
            continue
        actual_rate = float(y_true[mask].mean())
        predicted_mean = float(y_prob[mask].mean())
        count = int(mask.sum())
        gap = abs(actual_rate - predicted_mean)
        results.append({
            "bin": f"{bins[i]:.1f}-{bins[i+1]:.1f}",
            "count": count,
            "predicted_mean": round(predicted_mean, 4),
            "actual_rate": round(actual_rate, 4),
            "gap": round(gap, 4),
        })
    return results


def feature_importance_analysis(bundle):
    """Estrae feature importance dal modello sottostante."""
    model = bundle["model"]
    features = bundle["features"]

    # Il modello è CalibratedClassifierCV, dobbiamo estrarre il base estimator
    try:
        if hasattr(model, "calibrated_classifiers_"):
            base = model.calibrated_classifiers_[0].estimator
            importances = base.feature_importances_
            fi = sorted(
                zip(features, importances.tolist()),
                key=lambda x: x[1],
                reverse=True,
            )
            return [{"feature": f, "importance": round(imp, 6)} for f, imp in fi]
    except Exception as e:
        return [{"error": str(e)}]
    return [{"error": "Cannot extract feature importance"}]


def scenario_predictions(model, features):
    """Scenari estremi per verificare la sensatezza delle predizioni."""
    scenarios = {}

    # Scenario 1: Giocatore dominante al servizio
    dominant_serve = pd.DataFrame([{f: 0.0 for f in features}])
    dominant_serve["SetNo"] = 2
    dominant_serve["GameNo"] = 7
    dominant_serve["PointNumber"] = 80
    dominant_serve["is_player_on_serve"] = 1
    dominant_serve["pct_service_points_won"] = 0.80
    dominant_serve["pct_return_points_won"] = 0.45
    dominant_serve["pct_first_serve_points_won"] = 0.85
    dominant_serve["pct_second_serve_points_won"] = 0.60
    dominant_serve["last_n_points_won_5"] = 0.8
    dominant_serve["momentum_trend"] = 0.3
    dominant_serve["serve_advantage"] = 0.35
    dominant_serve["first_second_gap"] = 0.25
    dominant_serve["ServeNumber"] = 1
    dominant_serve["service_points_played"] = 40
    dominant_serve["service_points_won"] = 32
    dominant_serve["return_points_played"] = 40
    dominant_serve["return_points_won"] = 18
    prob = float(model.predict_proba(dominant_serve[features])[0, 1])
    scenarios["dominant_server"] = {
        "description": "Giocatore forte al servizio, 1st serve, momentum alto",
        "win_probability": round(prob, 4),
        "verdict": "OK" if prob > 0.65 else "⚠️ TROPPO BASSA"
    }

    # Scenario 2: Giocatore in difficoltà alla risposta
    struggling = pd.DataFrame([{f: 0.0 for f in features}])
    struggling["SetNo"] = 3
    struggling["GameNo"] = 10
    struggling["PointNumber"] = 150
    struggling["is_player_on_serve"] = 0
    struggling["pct_service_points_won"] = 0.50
    struggling["pct_return_points_won"] = 0.25
    struggling["pct_first_serve_points_won"] = 0.55
    struggling["pct_second_serve_points_won"] = 0.35
    struggling["last_n_points_won_5"] = 0.2
    struggling["momentum_trend"] = -0.3
    struggling["serve_advantage"] = 0.25
    struggling["first_second_gap"] = 0.20
    struggling["is_break_point"] = 0
    struggling["ServeNumber"] = 1
    struggling["service_points_played"] = 75
    struggling["service_points_won"] = 38
    struggling["return_points_played"] = 75
    struggling["return_points_won"] = 19
    prob2 = float(model.predict_proba(struggling[features])[0, 1])
    scenarios["struggling_returner"] = {
        "description": "Giocatore in difficoltà alla risposta, momentum negativo",
        "win_probability": round(prob2, 4),
        "verdict": "OK" if prob2 < 0.40 else "⚠️ TROPPO ALTA"
    }

    # Scenario 3: Punto equilibrato
    balanced = pd.DataFrame([{f: 0.0 for f in features}])
    balanced["SetNo"] = 2
    balanced["GameNo"] = 6
    balanced["PointNumber"] = 100
    balanced["is_player_on_serve"] = 1
    balanced["pct_service_points_won"] = 0.62
    balanced["pct_return_points_won"] = 0.38
    balanced["pct_first_serve_points_won"] = 0.70
    balanced["pct_second_serve_points_won"] = 0.50
    balanced["last_n_points_won_5"] = 0.5
    balanced["momentum_trend"] = 0.0
    balanced["serve_advantage"] = 0.24
    balanced["first_second_gap"] = 0.20
    balanced["ServeNumber"] = 1
    balanced["service_points_played"] = 50
    balanced["service_points_won"] = 31
    balanced["return_points_played"] = 50
    balanced["return_points_won"] = 19
    prob3 = float(model.predict_proba(balanced[features])[0, 1])
    scenarios["balanced_point"] = {
        "description": "Punto equilibrato, al servizio con stats medie",
        "win_probability": round(prob3, 4),
        "verdict": "OK" if 0.45 < prob3 < 0.70 else "⚠️ FUORI RANGE ATTESO"
    }

    # Scenario 4: Break point sotto pressione
    breakpoint = pd.DataFrame([{f: 0.0 for f in features}])
    breakpoint["SetNo"] = 3
    breakpoint["GameNo"] = 10
    breakpoint["PointNumber"] = 160
    breakpoint["is_player_on_serve"] = 1
    breakpoint["pct_service_points_won"] = 0.55
    breakpoint["pct_return_points_won"] = 0.40
    breakpoint["pct_first_serve_points_won"] = 0.60
    breakpoint["pct_second_serve_points_won"] = 0.40
    breakpoint["last_n_points_won_5"] = 0.4
    breakpoint["momentum_trend"] = -0.1
    breakpoint["serve_advantage"] = 0.15
    breakpoint["first_second_gap"] = 0.20
    breakpoint["is_break_point"] = 1
    breakpoint["is_game_point_against"] = 1
    breakpoint["ServeNumber"] = 2
    breakpoint["score_pressure_index"] = 4.5
    breakpoint["service_points_played"] = 80
    breakpoint["service_points_won"] = 44
    breakpoint["return_points_played"] = 80
    breakpoint["return_points_won"] = 32
    prob4 = float(model.predict_proba(breakpoint[features])[0, 1])
    scenarios["break_point_against"] = {
        "description": "Servizio su break point contro, 2nd serve, pressione alta",
        "win_probability": round(prob4, 4),
        "verdict": "OK" if prob4 < 0.55 else "⚠️ TROPPO ALTA per situazione di pressione"
    }

    return scenarios


def redundancy_analysis(df, features):
    """Verifica ridondanza e collinearità."""
    X = df[features].fillna(0.0)
    corr = X.corr()
    high_corrs = []
    for i in range(len(features)):
        for j in range(i + 1, len(features)):
            c = abs(corr.iloc[i, j])
            if c > 0.95:
                high_corrs.append({
                    "feature_1": features[i],
                    "feature_2": features[j],
                    "correlation": round(float(c), 6),
                    "action": "RIMUOVERE UNA — ridondanza pura" if c > 0.999 else "MONITORARE",
                })
    return high_corrs


def temporal_cv_analysis(df, features, n_splits=5):
    """Cross-validation temporale per verificare stabilità."""
    ordered = df.sort_values(["match_id", "SetNo", "GameNo", "PointNumber"]).reset_index(drop=True)
    unique_matches = ordered["match_id"].dropna().unique().tolist()
    
    fold_size = len(unique_matches) // n_splits
    results = []
    
    for fold in range(1, n_splits):
        train_end = fold * fold_size
        test_end = min(train_end + fold_size, len(unique_matches))
        
        train_match_set = set(unique_matches[:train_end])
        test_match_set = set(unique_matches[train_end:test_end])
        
        train_df = ordered[ordered["match_id"].isin(train_match_set)]
        test_df = ordered[ordered["match_id"].isin(test_match_set)]
        
        X_train = train_df[features].fillna(0.0)
        y_train = train_df["point_won"].astype(int)
        X_test = test_df[features].fillna(0.0)
        y_test = test_df["point_won"].astype(int)
        
        from xgboost import XGBClassifier
        from sklearn.calibration import CalibratedClassifierCV
        
        model = XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, eval_metric="logloss",
            tree_method="hist", random_state=42,
        )
        model.fit(X_train, y_train)
        
        cal = CalibratedClassifierCV(estimator=model, method="isotonic", cv="prefit")
        cal.fit(X_train, y_train)
        
        y_prob = cal.predict_proba(X_test)[:, 1]
        y_pred = cal.predict(X_test)
        
        results.append({
            "fold": fold,
            "train_matches": len(train_match_set),
            "test_matches": len(test_match_set),
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            "brier_score": round(float(brier_score_loss(y_test, y_prob)), 4),
            "log_loss": round(float(log_loss(y_test, y_prob)), 4),
        })
    
    return results


def main():
    print("=" * 70)
    print("  TENNISAI PRO — DIAGNOSTICA COMPLETA MODELLO IN PRODUZIONE")
    print("=" * 70)

    # ── 1. Caricamento bundle ──────────────────────────
    print("\n[1/8] Caricamento bundle dal file .pkl...")
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    features = bundle["features"]

    bundle_info = {
        "version": bundle.get("version", "N/A"),
        "model_type": bundle.get("model_type", "N/A"),
        "base_model_type": bundle.get("base_model_type", "N/A"),
        "calibration_method": bundle.get("calibration_method", "N/A"),
        "split_type": bundle.get("split_type", "N/A"),
        "n_features": len(features),
        "features": features,
        "stored_brier": bundle.get("calibrated_metrics", {}).get("brier_score"),
        "stored_accuracy": bundle.get("calibrated_metrics", {}).get("accuracy"),
        "stored_roc_auc": bundle.get("calibrated_metrics", {}).get("roc_auc"),
    }
    print(f"  Versione: {bundle_info['version']}")
    print(f"  Tipo: {bundle_info['model_type']} ({bundle_info['calibration_method']})")
    print(f"  Features: {bundle_info['n_features']}")
    print(f"  Brier (stored): {bundle_info['stored_brier']:.4f}")
    print(f"  Accuracy (stored): {bundle_info['stored_accuracy']:.4f}")
    print(f"  ROC AUC (stored): {bundle_info['stored_roc_auc']:.4f}")

    # ── 2. Feature Importance ──────────────────────────
    print("\n[2/8] Estrazione Feature Importance...")
    fi = feature_importance_analysis(bundle)
    print("  Top 10 features:")
    for item in fi[:10]:
        if "feature" in item:
            print(f"    {item['feature']:40s} → {item['importance']:.6f}")

    # ── 3. Caricamento dati e split ──────────────────────
    print("\n[3/8] Caricamento dataset e split temporale...")
    df = pd.read_csv(DATA_PATH)
    df = add_derived_features(df)
    train_df, test_df = temporal_match_split(df, test_ratio=0.2)
    
    X_test = test_df[features].fillna(0.0)
    y_test = test_df["point_won"].astype(int)
    
    print(f"  Test set: {len(test_df)} righe, {test_df['match_id'].nunique()} match")

    # ── 4. Ri-valutazione metriche ──────────────────────
    print("\n[4/8] Ri-valutazione metriche sul test set...")
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    fresh_metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 6),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 6),
        "brier_score": round(float(brier_score_loss(y_test, y_prob)), 6),
        "log_loss": round(float(log_loss(y_test, y_prob)), 6),
    }
    
    # Verifica coerenza con metriche stodate
    brier_match = abs(fresh_metrics["brier_score"] - bundle_info["stored_brier"]) < 0.001
    acc_match = abs(fresh_metrics["accuracy"] - bundle_info["stored_accuracy"]) < 0.001
    roc_match = abs(fresh_metrics["roc_auc"] - bundle_info["stored_roc_auc"]) < 0.001
    
    consistency = {
        "brier_consistent": brier_match,
        "accuracy_consistent": acc_match,
        "roc_auc_consistent": roc_match,
        "all_consistent": brier_match and acc_match and roc_match,
    }
    
    print(f"  Accuracy:   {fresh_metrics['accuracy']:.6f} (stored: {bundle_info['stored_accuracy']:.6f}) {'✅' if acc_match else '❌'}")
    print(f"  ROC AUC:    {fresh_metrics['roc_auc']:.6f} (stored: {bundle_info['stored_roc_auc']:.6f}) {'✅' if roc_match else '❌'}")
    print(f"  Brier:      {fresh_metrics['brier_score']:.6f} (stored: {bundle_info['stored_brier']:.6f}) {'✅' if brier_match else '❌'}")
    print(f"  Log Loss:   {fresh_metrics['log_loss']:.6f}")

    # ── 5. Distribuzione probabilità ─────────────────────
    print("\n[5/8] Distribuzione delle probabilità predette...")
    prob_dist = analyze_probability_distribution(y_prob)
    print(f"  Range: [{prob_dist['min']:.4f}, {prob_dist['max']:.4f}]")
    print(f"  Media: {prob_dist['mean']:.4f}  |  Mediana: {prob_dist['median']:.4f}  |  Std: {prob_dist['std']:.4f}")
    print(f"  <0.1: {prob_dist['pct_below_0.1']:.1f}%  |  0.1-0.3: {prob_dist['pct_0.1_to_0.3']:.1f}%  |  0.3-0.5: {prob_dist['pct_0.3_to_0.5']:.1f}%")
    print(f"  0.5-0.7: {prob_dist['pct_0.5_to_0.7']:.1f}%  |  0.7-0.9: {prob_dist['pct_0.7_to_0.9']:.1f}%  |  >0.9: {prob_dist['pct_above_0.9']:.1f}%")

    # ── 6. Calibrazione ─────────────────────────────────
    print("\n[6/8] Analisi di calibrazione per bins...")
    y_test_np = y_test.values
    cal_bins = calibration_analysis(y_test_np, y_prob, n_bins=10)
    max_gap = 0
    for b in cal_bins:
        gap_icon = "✅" if b["gap"] < 0.03 else ("⚠️" if b["gap"] < 0.05 else "❌")
        print(f"  {b['bin']:10s}  n={b['count']:7d}  pred={b['predicted_mean']:.4f}  actual={b['actual_rate']:.4f}  gap={b['gap']:.4f} {gap_icon}")
        max_gap = max(max_gap, b["gap"])
    
    calibration_verdict = "ECCELLENTE" if max_gap < 0.02 else ("BUONA" if max_gap < 0.04 else ("ACCETTABILE" if max_gap < 0.06 else "DA MIGLIORARE"))
    print(f"  → Gap massimo: {max_gap:.4f} — Calibrazione: {calibration_verdict}")

    # ── 7. Scenari estremi ───────────────────────────────
    print("\n[7/8] Test scenari estremi...")
    scenarios = scenario_predictions(model, features)
    for name, s in scenarios.items():
        print(f"  {name}: p(win)={s['win_probability']:.4f} — {s['verdict']}")
        print(f"    → {s['description']}")

    # ── 8. Ridondanza features ───────────────────────────
    print("\n[8/8] Analisi ridondanza features...")
    redundancies = redundancy_analysis(test_df, features)
    if redundancies:
        for r in redundancies:
            print(f"  ⚠️  {r['feature_1']} ↔ {r['feature_2']}: corr={r['correlation']:.6f} → {r['action']}")
    else:
        print("  ✅ Nessuna ridondanza critica (>0.95)")

    # ── BONUS: Temporal CV ──────────────────────────────
    print("\n[BONUS] Cross-validation temporale (4 fold)...")
    cv_results = temporal_cv_analysis(df, features, n_splits=5)
    accs = [r["accuracy"] for r in cv_results]
    aucs = [r["roc_auc"] for r in cv_results]
    briers = [r["brier_score"] for r in cv_results]
    for r in cv_results:
        print(f"  Fold {r['fold']}: Acc={r['accuracy']:.4f}  AUC={r['roc_auc']:.4f}  Brier={r['brier_score']:.4f}  LogLoss={r['log_loss']:.4f}")
    
    cv_stability = {
        "accuracy_mean": round(float(np.mean(accs)), 4),
        "accuracy_std": round(float(np.std(accs)), 4),
        "roc_auc_mean": round(float(np.mean(aucs)), 4),
        "roc_auc_std": round(float(np.std(aucs)), 4),
        "brier_mean": round(float(np.mean(briers)), 4),
        "brier_std": round(float(np.std(briers)), 4),
    }
    
    stability_verdict = "STABILE" if cv_stability["accuracy_std"] < 0.01 else "INSTABILE"
    print(f"\n  → Stabilità: Acc={cv_stability['accuracy_mean']:.4f}±{cv_stability['accuracy_std']:.4f}  "
          f"AUC={cv_stability['roc_auc_mean']:.4f}±{cv_stability['roc_auc_std']:.4f}  "
          f"Brier={cv_stability['brier_mean']:.4f}±{cv_stability['brier_std']:.4f}")
    print(f"  → Verdetto stabilità: {stability_verdict}")

    # ── RIEPILOGO ────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  RIEPILOGO DIAGNOSTICA")
    print("=" * 70)
    
    issues = []
    if not consistency["all_consistent"]:
        issues.append("❌ Metriche non coerenti con quelle stodate nel bundle")
    if max_gap > 0.05:
        issues.append(f"⚠️ Calibrazione con gap max {max_gap:.4f}")
    if redundancies:
        issues.append(f"⚠️ {len(redundancies)} coppie di features ridondanti")
    if stability_verdict == "INSTABILE":
        issues.append("⚠️ Modello instabile nelle fold temporali")
    
    all_scenario_ok = all(s["verdict"] == "OK" for s in scenarios.values())
    if not all_scenario_ok:
        issues.append("⚠️ Alcuni scenari hanno predizioni fuori range atteso")
    
    if not issues:
        print("  ✅ MODELLO IN OTTIMO STATO — Nessun problema critico rilevato")
    else:
        for issue in issues:
            print(f"  {issue}")
    
    # ── Salvataggio report ───────────────────────────────
    report = {
        "model_info": bundle_info,
        "feature_importance": fi,
        "fresh_metrics": fresh_metrics,
        "consistency_check": consistency,
        "probability_distribution": prob_dist,
        "calibration_bins": cal_bins,
        "calibration_verdict": calibration_verdict,
        "max_calibration_gap": max_gap,
        "scenarios": scenarios,
        "redundancies": redundancies,
        "temporal_cv": cv_results,
        "cv_stability": cv_stability,
        "stability_verdict": stability_verdict,
        "issues": issues,
        "overall_verdict": "PASS" if not issues else "ATTENZIONE",
    }
    
    # Convert features list to avoid serialization issues
    report["model_info"]["features"] = list(report["model_info"]["features"])
    
    with open(REPORT_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n  Report completo salvato in: {REPORT_OUTPUT}")
    print("=" * 70)


if __name__ == "__main__":
    main()
