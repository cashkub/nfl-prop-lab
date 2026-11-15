import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from nfl_availability import availability, classify


def test_classify_separates_benched_from_injured():
    assert classify([], {}, set()) is None
    assert classify([8, 9], {8: 0.0}, set()) == "no-role"
    assert classify([4, 5], {}, {4, 5}) == "returning"
    assert classify([7, 8], {}, set()) == "inactive"
    # Dressed and played real snaps without a stat line is not a benching.
    assert classify([8], {8: 0.4}, {8}) == "returning"


def game(week, team="SEA"):
    return {"season": 2026, "week": week, "team": team, "seasonType": "REG"}


def test_availability_uses_team_games_after_last_appearance():
    players = [
        {"id": "starter", "games": [game(8), game(9)]},
        {"id": "backup", "games": [game(6), game(7)]},
        {"id": "regular", "games": [game(7), game(8), game(9)]},
    ]
    snaps = [{"pfr_player_id": "B", "week": "8", "offense_pct": "0", "game_type": "REG"}]
    flags = availability(players, 2026, snaps, [], {"B": "backup"})
    assert flags == {"backup": {"status": "no-role", "season": 2026, "lastPlayedWeek": 7,
                                "missedWeeks": [8, 9], "asOfWeek": 9}}
