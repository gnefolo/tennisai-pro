#!/usr/bin/env python3
"""
atp_to_tennisai.py — Converte un file PBP ATP in formato importabile da TennisAI Pro.

Uso:
  python scripts/atp_to_tennisai.py <atp_pbp_file.json> [--me 1|2]

Esempio:
  python scripts/atp_to_tennisai.py atp_pbp_ms093.json --me 1

Output:
  tennisai_<slug>.json — pronto per essere importato dal pulsante "Importa" nella
                         pagina LiveMatch di TennisAI Pro.

Opzioni:
  --me 1|2   Chi è il giocatore monitorato (1=P1, 2=P2). Default: 1.
  --bo5      Usa formato Best of 5 (default: BO3).
  --name     Nome del giocatore "me" (sovrascrive quello estratto dal PBP).
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


# ── Tennis scoring engine ─────────────────────────────────────────────────────

SCORE_SEQ = ["0", "15", "30", "40"]


class TennisScoreEngine:
    """Replica esatta della logica handlePointWonInternal in LiveMatchPage.tsx."""

    def __init__(self, match_type: str = "BO3"):
        self.match_type = match_type
        self.sets_to_win = 3 if match_type == "BO5" else 2

        # Stato punteggio
        self.sets_me = 0
        self.sets_opp = 0
        self.games_me = 0
        self.games_opp = 0
        self.point_me: str = "0"
        self.point_opp: str = "0"
        self.set_number = 1
        self.game_number = 1
        self.point_number = 1
        self.is_match_over = False
        self.match_winner: str | None = None

    def _score_won(self, s: str) -> str:
        idx = SCORE_SEQ.index(s) if s in SCORE_SEQ else 3
        return SCORE_SEQ[min(idx + 1, 3)]

    @property
    def is_tiebreak(self) -> bool:
        return self.games_me == 6 and self.games_opp == 6

    def snapshot(self) -> dict:
        """Restituisce lo stato PRIMA del punto corrente."""
        return {
            "sets_me": self.sets_me,
            "sets_opp": self.sets_opp,
            "games_me": self.games_me,
            "games_opp": self.games_opp,
            "point_score_me": self.point_me,
            "point_score_opp": self.point_opp,
            "set_number": self.set_number,
            "game_number": self.game_number,
            "point_number": self.point_number,
            "is_tiebreak": self.is_tiebreak,
        }

    def _win_game(self, winner_me: bool) -> None:
        self.point_me = "0"
        self.point_opp = "0"
        if winner_me:
            self.games_me += 1
        else:
            self.games_opp += 1
        self.game_number += 1

        is_tb_result = (self.games_me == 7 and self.games_opp == 6) or \
                       (self.games_opp == 7 and self.games_me == 6)
        is_normal_win = (self.games_me >= 6 and self.games_me >= self.games_opp + 2) or \
                        (self.games_opp >= 6 and self.games_opp >= self.games_me + 2)
        if is_tb_result or is_normal_win:
            self._win_set(self.games_me > self.games_opp)

    def _win_set(self, winner_me: bool) -> None:
        if winner_me:
            self.sets_me += 1
        else:
            self.sets_opp += 1
        self.games_me = 0
        self.games_opp = 0
        self.set_number += 1
        self.game_number = 1
        if self.sets_me >= self.sets_to_win:
            self.is_match_over = True
            self.match_winner = "me"
        elif self.sets_opp >= self.sets_to_win:
            self.is_match_over = True
            self.match_winner = "opponent"

    def advance(self, winner_me: bool) -> None:
        """Avanza lo stato dopo che un punto è stato giocato."""
        if self.is_match_over:
            return
        if self.is_tiebreak:
            # Tiebreak: punteggio numerico, primo a 7 con 2 di margine
            my_n = int(self.point_me) if self.point_me != "0" else 0
            op_n = int(self.point_opp) if self.point_opp != "0" else 0
            if winner_me:
                ns = my_n + 1
                if ns >= 7 and ns - op_n >= 2:
                    self._win_game(winner_me=True)
                else:
                    self.point_me = str(ns)
            else:
                ns = op_n + 1
                if ns >= 7 and ns - my_n >= 2:
                    self._win_game(winner_me=False)
                else:
                    self.point_opp = str(ns)
        elif winner_me:
            if self.point_me == "40" and self.point_opp == "Ad":
                self.point_opp = "40"            # back to deuce
            elif self.point_me == "40" and self.point_opp == "40":
                self.point_me = "Ad"             # me → Ad
            elif self.point_me == "Ad":
                self._win_game(winner_me=True)   # game me
            elif self.point_me == "40" and self.point_opp not in ("40", "Ad"):
                self._win_game(winner_me=True)   # 40-x → game me
            else:
                self.point_me = self._score_won(self.point_me)
        else:
            if self.point_opp == "40" and self.point_me == "Ad":
                self.point_me = "40"             # back to deuce
            elif self.point_opp == "40" and self.point_me == "40":
                self.point_opp = "Ad"            # opp → Ad
            elif self.point_opp == "Ad":
                self._win_game(winner_me=False)  # game opp
            elif self.point_opp == "40" and self.point_me not in ("40", "Ad"):
                self._win_game(winner_me=False)  # opp 40-x → game opp
            else:
                self.point_opp = self._score_won(self.point_opp)

        if not self.is_match_over:
            self.point_number += 1


# ── isBreakPoint / isGamePoint — replica di LiveMatchPage.tsx ─────────────────

def _is_advantage(score_a: str, score_b: str) -> bool:
    if score_a == "Ad":
        return True
    if score_a == "40" and score_b not in ("40", "Ad"):
        return True
    return False


def compute_flags(snap: dict, is_on_serve_me: bool) -> dict:
    """Restituisce isBreakPoint, isGamePoint, isGamePointAgainst."""
    pm = snap["point_score_me"]
    po = snap["point_score_opp"]
    if snap["is_tiebreak"]:
        # In tiebreak: game point se il puntatore è avanti di almeno 1 ed è a ≥6
        my_n = int(pm) if pm != "0" else 0
        op_n = int(po) if po != "0" else 0
        if is_on_serve_me:
            game_pt = (my_n >= 6 and my_n - op_n >= 1) or (my_n >= 6 and my_n >= op_n + 1)
            brk_pt  = (op_n >= 6 and op_n - my_n >= 1) or (op_n >= 6 and op_n >= my_n + 1)
        else:
            game_pt = (op_n >= 6 and op_n - my_n >= 1) or (op_n >= 6 and op_n >= my_n + 1)
            brk_pt  = (my_n >= 6 and my_n - op_n >= 1) or (my_n >= 6 and my_n >= op_n + 1)
        return {
            "isBreakPoint": 1 if brk_pt else 0,
            "isGamePoint": 1 if game_pt else 0,
            "isGamePointAgainst": 1 if brk_pt else 0,
        }
    if is_on_serve_me:
        gp = _is_advantage(pm, po)
        bp = _is_advantage(po, pm)
    else:
        gp = _is_advantage(po, pm)
        bp = _is_advantage(pm, po)
    return {
        "isBreakPoint": 1 if bp else 0,
        "isGamePoint": 1 if gp else 0,
        "isGamePointAgainst": 1 if bp else 0,
    }


# ── Mapping ATP → TennisAI Pro ────────────────────────────────────────────────

def rally_bucket(rally: int | None) -> str | None:
    if rally is None:
        return None
    if rally <= 4:
        return "SHORT"
    if rally <= 8:
        return "MEDIUM"
    return "LONG"


def finish_type(result: str) -> str | None:
    return {
        "W": "WINNER",
        "UE": "UNFORCED_ERROR",
        "FE": "FORCED_ERROR",
    }.get(result)


def finish_shot(result: str, stroke: str | None) -> str | None:
    if result in ("A", "DF"):
        return "SERVE"
    stroke_map = {
        "F": "FOREHAND", "FH": "FOREHAND",
        "B": "BACKHAND", "BH": "BACKHAND",
        "V": "VOLLEY", "VF": "VOLLEY", "VB": "VOLLEY",
        "S": "SMASH", "SM": "SMASH",
        "P": "PASSING", "PF": "PASSING", "PB": "PASSING",
    }
    return stroke_map.get((stroke or "").upper())


def macro_pattern(result: str, rally: int | None, server_won: bool) -> str | None:
    if result == "A":
        return "SERVE_DOMINANT"
    if result == "DF":
        return None
    r = rally or 0
    if server_won and r <= 2:
        return "SERVE_DOMINANT"
    if not server_won and r <= 2:
        return "AGGRESSIVE_RETURN"
    if r <= 4:
        return "SHORT_RALLY"
    if r <= 8:
        return "MEDIUM_RALLY"
    return "LONG_RALLY"


# ── Running stats tracker ─────────────────────────────────────────────────────

class StatsTracker:
    def __init__(self):
        self.svc_played = 0; self.svc_won = 0
        self.rtn_played = 0; self.rtn_won = 0
        self.fst_played = 0; self.fst_won = 0
        self.snd_played = 0; self.snd_won = 0
        self.recent: list[int] = []   # 1=me won, 0=opp won (last 5)

    def snapshot(self) -> dict:
        return {
            "pct_svc": self.svc_won / self.svc_played if self.svc_played else 0.0,
            "pct_rtn": self.rtn_won / self.rtn_played if self.rtn_played else 0.0,
            "pct_fst": self.fst_won / self.fst_played if self.fst_played else 0.0,
            "pct_snd": self.snd_won / self.snd_played if self.snd_played else 0.0,
            "momentum": sum(self.recent) / len(self.recent) if self.recent else 0.5,
        }

    def advance(self, is_on_serve_me: bool, serve_number: int | str, me_won: bool) -> None:
        if is_on_serve_me:
            self.svc_played += 1
            if me_won:
                self.svc_won += 1
            sn = 1 if serve_number == "ACE" else int(serve_number)
            if sn == 1:
                self.fst_played += 1
                if me_won:
                    self.fst_won += 1
            else:
                self.snd_played += 1
                if me_won:
                    self.snd_won += 1
        else:
            self.rtn_played += 1
            if me_won:
                self.rtn_won += 1
        self.recent.append(1 if me_won else 0)
        if len(self.recent) > 5:
            self.recent.pop(0)


# ── Determinazione "chi serve" per punto ─────────────────────────────────────

def determine_serve_number(atp_point: dict) -> int | str:
    result = atp_point.get("result", "")
    serve = atp_point.get("serve", 1)
    if result == "A":
        return "ACE"
    return int(serve) if serve in (1, 2) else 1


# ── Conversione principale ────────────────────────────────────────────────────

def convert(pbp_data: dict, me_player: int = 1, match_type: str = "BO3") -> dict:
    points_raw = pbp_data["points"]
    p1_name = pbp_data.get("player1", "Player 1")
    p2_name = pbp_data.get("player2", "Player 2")
    me_name = p1_name if me_player == 1 else p2_name
    opp_name = p2_name if me_player == 1 else p1_name

    # Determina chi serve per primo (server del primo punto nel set 1, game 1)
    first_point = next(
        (p for p in points_raw if p["set"] == 1 and p["game"] == 1),
        points_raw[0]
    )
    first_server_atp = int(first_point.get("server", 1))
    first_server = "me" if first_server_atp == me_player else "opponent"

    engine = TennisScoreEngine(match_type=match_type)
    stats = StatsTracker()
    now_ts = datetime.now(timezone.utc).isoformat()

    recorded: list[dict] = []

    for atp_pt in points_raw:
        snap = engine.snapshot()
        server_atp = int(atp_pt.get("server", 1))
        scorer_atp = int(atp_pt.get("scorer", 1))
        p1_won = atp_pt.get("p1_won", False)
        me_won = (p1_won and me_player == 1) or (not p1_won and me_player == 2)
        server_won = server_atp == scorer_atp
        is_on_serve_me = server_atp == me_player

        result = atp_pt.get("result", "")
        stroke = atp_pt.get("stroke")
        rally = atp_pt.get("rallyCount")
        sn = determine_serve_number(atp_pt)

        stats_snap = stats.snapshot()
        flags = compute_flags(snap, is_on_serve_me)

        rec: dict = {
            "id": f"pt_{atp_pt['set']}_{atp_pt['game']}_{atp_pt['point']}_{int(me_won)}",
            "set": snap["set_number"],
            "game": snap["game_number"],
            "pointNumber": snap["point_number"],
            "isOnServe": 1 if is_on_serve_me else 0,
            "serveNumber": sn,
            "serveDirection": None,
            "serveQuality": None,
            "returnType": None,
            "rallyBucket": rally_bucket(rally),
            "rallyPhase": None,
            "keyEvent": "BP" if flags["isBreakPoint"] else ("GP" if flags["isGamePoint"] else "NONE"),
            "finishType": finish_type(result),
            "finishShot": finish_shot(result, stroke),
            "macroPattern": macro_pattern(result, rally, server_won),
            "rallyCount": rally or 0,
            "pctServicePointsWon": round(stats_snap["pct_svc"], 4),
            "pctReturnPointsWon": round(stats_snap["pct_rtn"], 4),
            "pctFirstServePointsWon": round(stats_snap["pct_fst"], 4),
            "pctSecondServePointsWon": round(stats_snap["pct_snd"], 4),
            "momentumLast5": round(stats_snap["momentum"], 4),
            "isBreakPoint": flags["isBreakPoint"],
            "isGamePoint": flags["isGamePoint"],
            "isGamePointAgainst": flags["isGamePointAgainst"],
            "isPointWon": 1 if me_won else 0,
            "setScoreMe": snap["sets_me"],
            "setScoreOpp": snap["sets_opp"],
            "gameScoreMe": snap["games_me"],
            "gameScoreOpp": snap["games_opp"],
            "pointScoreMe": snap["point_score_me"],
            "pointScoreOpp": snap["point_score_opp"],
            "timestamp": now_ts,
        }
        recorded.append(rec)

        stats.advance(is_on_serve_me, sn, me_won)
        engine.advance(me_won)

    # Stato finale dopo l'ultimo punto
    final = engine.snapshot()

    # ── Player e sessione ─────────────────────────────────────────────────────
    player_id = str(uuid.uuid4())
    session_id = str(uuid.uuid4())

    player = {
        "id": player_id,
        "name": me_name,
        "handedness": "R",
        "playStyle": "baseliner",
        "notes": f"Importato da ATP Tour — {pbp_data.get('match_id', '')}",
    }

    session = {
        "id": session_id,
        "playerId": player_id,
        "opponentName": opp_name,
        "tournament": pbp_data.get("tournament", ""),
        "surface": pbp_data.get("surface", "Clay"),
        "matchType": match_type,
        "firstServer": first_server,
        "round": pbp_data.get("round", ""),
        "createdAt": now_ts,
    }

    # ── Stato live finale ─────────────────────────────────────────────────────
    live_state = {
        "currentSessionId": session_id,
        "setNumber": final["set_number"],
        "gameNumber": final["game_number"],
        "pointNumber": final["point_number"],
        "setsMe": final["sets_me"],
        "setsOpp": final["sets_opp"],
        "gamesMe": final["games_me"],
        "gamesOpp": final["games_opp"],
        "pointScoreMe": final["point_score_me"],
        "pointScoreOpp": final["point_score_opp"],
        "recordedPoints": recorded,
        "isMatchOver": engine.is_match_over,
        "matchWinner": engine.match_winner,
        "firstServer": first_server,
    }

    winner_atp = pbp_data.get("winner", "")
    return {
        "format": "tennisai_import_v1",
        "meta": {
            "source": "ATP Tour Stats Centre",
            "matchId": pbp_data.get("match_id", ""),
            "eventId": pbp_data.get("event_id", ""),
            "year": pbp_data.get("year", ""),
            "tournament": pbp_data.get("tournament", ""),
            "surface": pbp_data.get("surface", ""),
            "round": pbp_data.get("round", ""),
            "player1": p1_name,
            "player2": p2_name,
            "winner": winner_atp,
            "mePlayer": me_player,
            "totalPoints": len(recorded),
        },
        "player": player,
        "session": session,
        "liveState": live_state,
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="File atp_pbp_*.json prodotto da atp_scraper.py")
    parser.add_argument("--me", type=int, default=1, choices=[1, 2],
                        help="Giocatore 'me' (1=P1, 2=P2). Default: 1")
    parser.add_argument("--bo5", action="store_true",
                        help="Best of 5 (default: BO3)")
    args = parser.parse_args()

    pbp_path = Path(args.input)
    if not pbp_path.exists():
        print(f"Errore: file non trovato: {pbp_path}", file=sys.stderr)
        sys.exit(1)

    pbp_data = json.loads(pbp_path.read_text())
    match_type = "BO5" if args.bo5 else "BO3"

    print(f"=== ATP → TennisAI Pro Converter ===")
    print(f"Match : {pbp_data.get('player1')} vs {pbp_data.get('player2')}")
    print(f"Tornio: {pbp_data.get('tournament', '—')}")
    print(f"Me    : P{args.me} ({pbp_data.get('player1') if args.me==1 else pbp_data.get('player2')})")
    print(f"Format: {match_type}  |  Punti totali: {pbp_data.get('total_points', '?')}")

    result = convert(pbp_data, me_player=args.me, match_type=match_type)

    # ── Scrivi output ─────────────────────────────────────────────────────────
    slug = pbp_path.stem.replace("atp_pbp_", "")
    out_path = Path(f"tennisai_{slug}_p{args.me}.json")
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False))

    ls = result["liveState"]
    rp = ls["recordedPoints"]
    print(f"\n✓ Salvato: {out_path}")
    print(f"  Punti convertiti : {len(rp)}")
    print(f"  Match concluso   : {ls['isMatchOver']} "
          f"(vincitore: {ls.get('matchWinner', 'N/A')})")
    print(f"  Set finale       : {ls['setsMe']}-{ls['setsOpp']}")
    print(f"  Stato finale     : Set{ls['setNumber']} G{ls['gameNumber']} "
          f"P{ls['pointNumber']} | Score: {ls['pointScoreMe']}-{ls['pointScoreOpp']}")

    # Verifica punto singolo
    if rp:
        p = rp[0]
        print(f"\n  Primo punto (S{p['set']}G{p['game']}P{p['pointNumber']}):")
        print(f"    isOnServe={p['isOnServe']}  serveNumber={p['serveNumber']}")
        print(f"    score={p['pointScoreMe']}-{p['pointScoreOpp']}  "
              f"games={p['gameScoreMe']}-{p['gameScoreOpp']}  sets={p['setScoreMe']}-{p['setScoreOpp']}")
        print(f"    result={pbp_data['points'][0].get('result')}  "
              f"finishType={p.get('finishType')}  macroPattern={p.get('macroPattern')}")

    print(f"\nImporta nell'app: usa il pulsante \"Importa Partita\" nella pagina LiveMatch.")


if __name__ == "__main__":
    main()
