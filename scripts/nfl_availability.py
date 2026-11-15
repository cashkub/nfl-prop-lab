"""Flag players who missed their team's latest games, and say why.

- "no-role": he dressed but took almost no offensive snaps (for example a back
  who lost the job when the starter came back). Never a pick.
- "returning": he sat out and has been on an injury report since his last game.
  Still eligible for picks.
- "inactive": he sat out with no injury listing (reserve list, healthy scratch).
  Eligible only when a sportsbook lists him for the game.
Uses free nflverse snap counts and injury reports.
"""
import csv
import io
import urllib.request

BASE = "https://github.com/nflverse/nflverse-data/releases/download"
ALIASES = {"LA": "LAR", "WSH": "WAS", "JAC": "JAX"}
NO_ROLE_SNAP_SHARE = 0.05


def _team(code):
    return ALIASES.get(code, code)


def _number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def classify(missed, snap_share, listed):
    """missed: weeks the team played without him; snap_share: week -> offensive
    snap share when he dressed; listed: weeks he was on an injury report."""
    if not missed:
        return None
    dressed = [week for week in missed if snap_share.get(week) is not None]
    if any(snap_share[week] < NO_ROLE_SNAP_SHARE for week in dressed):
        return "no-role"
    return "returning" if listed else "inactive"


def availability(players, season, snap_rows, injury_rows, pfr_to_gsis):
    team_weeks = {}
    for player in players:
        for game in player["games"]:
            if game["season"] == season and game.get("seasonType", "REG") == "REG":
                team_weeks.setdefault(_team(game["team"]), set()).add(int(game["week"]))
    snaps = {}
    for row in snap_rows:
        player_id, week, share = pfr_to_gsis.get(row.get("pfr_player_id")), _number(row.get("week")), _number(row.get("offense_pct"))
        if player_id and week and share is not None and row.get("game_type", "REG") == "REG":
            snaps.setdefault(player_id, {})[int(week)] = share
    listed = {}
    for row in injury_rows:
        week = _number(row.get("week"))
        if row.get("gsis_id") and week and row.get("season_type", "REG") == "REG":
            listed.setdefault(row["gsis_id"], set()).add(int(week))
    result = {}
    for player in players:
        games = [g for g in player["games"] if g["season"] == season and g.get("seasonType", "REG") == "REG"]
        if not games:
            continue
        last = max(games, key=lambda g: int(g["week"]))
        team, last_week = _team(last["team"]), int(last["week"])
        missed = sorted(week for week in team_weeks.get(team, ()) if week > last_week)
        status = classify(missed, snaps.get(player["id"], {}),
                          {week for week in listed.get(player["id"], ()) if week > last_week})
        if status:
            result[player["id"]] = {"status": status, "season": season, "lastPlayedWeek": last_week,
                                    "missedWeeks": missed, "asOfWeek": max(team_weeks[team])}
    return result


def _rows(path):
    with urllib.request.urlopen(f"{BASE}/{path}", timeout=45) as response:
        return list(csv.DictReader(io.TextIOWrapper(response, encoding="utf-8-sig")))


def add_availability(payload, previous, player_directory):
    season = max(payload["seasons"])
    try:
        ids = {r["pfr_id"]: r["gsis_id"] for r in player_directory if r.get("pfr_id") and r.get("gsis_id")}
        if not ids:
            raise ValueError("player directory unavailable")
        flags = availability(payload["players"], season, _rows(f"snap_counts/snap_counts_{season}.csv"),
                             _rows(f"injuries/injuries_{season}.csv"), ids)
    except (OSError, KeyError, ValueError) as exc:
        print(f"Availability flags unavailable: {exc}")
        flags = {p["id"]: p["availability"] for p in previous.get("players", []) if p.get("availability")}
    for player in payload["players"]:
        if player["id"] in flags:
            player["availability"] = flags[player["id"]]
        else:
            player.pop("availability", None)
