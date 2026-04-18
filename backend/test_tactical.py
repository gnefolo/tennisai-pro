import sys
import json
from pprint import pprint
import warnings

# Suppress XGBoost deprecation warnings if any
warnings.filterwarnings("ignore")

# Setup path so app modules can be found
sys.path.append("/Users/giovannigraziano/Desktop/tennisai-pro/backend")

from app.services.live_service import analyze_live_point

# 1. Favorevole, serve_second (No Momentum HOT, just standard favorable + serve second) -> probability needs to be > 0.65
# We can manipulate the model output slightly or mock the probability?
# Actually, analyze_live_point runs the win model.
# The win probability depends on score and stats. Let's make a payload for a point with high win proba.

payload_favorable = {
    "set": 1,
    "game": 1,
    "point_number": 1,
    "is_on_serve": 1,
    "serve_number": 2,
    "rally_count": 5,
    "stats": {
        "pctServicePointsWon": 0.8,
        "pctReturnPointsWon": 0.4,
        "pctFirstServePointsWon": 0.8,
        "pctSecondServePointsWon": 0.6,
        "momentumLast5": 1.0 # HOT momentum
    },
    "flags": {
        "isBreakPoint": False,
        "isGamePoint": True,
        "isGamePointAgainst": False
    },
    "tag": {
        "serve_direction": "WIDE",
        "serve_quality": "SAFE",
        "return_type": "DEEP",
        "rally_bucket": "SHORT",
        "rally_phase": "NEUTRAL",
        "key_event": "NONE",
        "finish_type": "WINNER",
        "finish_shot": "FOREHAND",
        "point_outcome": "WON"
    }
}

try:
    print("--- PUNTO 1 ---")
    res1 = analyze_live_point(payload_favorable)
    print("Point Win Probability:", res1.get("point_win_probability"))
    print("Tactical Call:", res1.get("tactical_call"))
    print("Tactical Explanation:", res1.get("tactical_explanation"))
    print("Risk Level:", res1.get("risk_level"))
    print("Confidence:", res1.get("tactical_confidence"))
    print("Suggestions:", res1.get("tactical_suggestion"))
except Exception as e:
    print("Error:", e)

payload_unfavorable_long = {
    "set": 1,
    "game": 1,
    "point_number": 2,
    "is_on_serve": 0,
    "serve_number": 1,
    "rally_count": 10,
    "stats": {
        "pctServicePointsWon": 0.2,
        "pctReturnPointsWon": 0.1,
        "pctFirstServePointsWon": 0.3,
        "pctSecondServePointsWon": 0.1,
        "momentumLast5": 0.0 # COLD momentum
    },
    "flags": {
        "isBreakPoint": True,
        "isGamePoint": False,
        "isGamePointAgainst": True
    },
    "tag": {
        "rally_bucket": "LONG"
    }
}

try:
    print("\n--- PUNTO 2 ---")
    res2 = analyze_live_point(payload_unfavorable_long)
    print("Point Win Probability:", res2.get("point_win_probability"))
    print("Tactical Call:", res2.get("tactical_call"))
    print("Tactical Explanation:", res2.get("tactical_explanation"))
    print("Risk Level:", res2.get("risk_level"))
    print("Suggestions:", res2.get("tactical_suggestion"))
except Exception as e:
    print("Error:", e)

