from pydantic import BaseModel
from typing import Optional, List


class LiveStatsIn(BaseModel):
    pctServicePointsWon: float
    pctReturnPointsWon: float
    pctFirstServePointsWon: float
    pctSecondServePointsWon: float
    momentumLast5: float


class LiveFlagsIn(BaseModel):
    isBreakPoint: bool
    isGamePoint: bool
    isGamePointAgainst: bool


class TacticalTagIn(BaseModel):
    serve_direction: Optional[str] = None
    serve_quality: Optional[str] = None
    return_type: Optional[str] = None
    rally_bucket: Optional[str] = None
    rally_phase: Optional[str] = None
    key_event: Optional[str] = None
    finish_type: Optional[str] = None
    finish_shot: Optional[str] = None
    point_outcome: Optional[str] = None


class LiveTaggedPointRequest(BaseModel):
    set: int
    game: int
    point_number: int
    is_on_serve: int
    serve_number: int
    rally_count: int
    stats: LiveStatsIn
    flags: LiveFlagsIn
    tag: TacticalTagIn


class PatternInfoOut(BaseModel):
    pattern_id: int
    pattern_name: str
    confidence: Optional[float] = None
    explanation: Optional[str] = None


class QuickStatsOut(BaseModel):
    pct_service_points_won: float
    pct_return_points_won: float
    pct_first_serve_points_won: float
    pct_second_serve_points_won: float


class LiveTaggedPointResponse(BaseModel):
    point_win_probability: float
    prediction: int
    pattern_rule: PatternInfoOut
    pattern_ml: Optional[PatternInfoOut] = None
    pattern_fused: PatternInfoOut
    tactical_suggestion: List[str]
    quick_stats: QuickStatsOut
    tagged_pattern: str
    point_description: str
    next_point_pattern_hint: str

    tactical_call: Optional[str] = None
    tactical_confidence: Optional[str] = None
    momentum_state: Optional[str] = None
    serve_state: Optional[str] = None
    rally_profile: Optional[str] = None
    pressure_state: Optional[str] = None