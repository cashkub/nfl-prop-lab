"""CBB Top Looks without sportsbook odds.

Each player's line is his own season average rounded to a half point, the way
books post it. The chance comes from the model's simulated games (draws), pulled
toward 50% when there are few of them. Small lines are skipped, like NFL.
"""
import math

LOOK_MARKETS = ['points', 'rebounds', 'assists', 'threes', 'PRA']
MIN_LINE = {'points': 9.5, 'rebounds': 4.5, 'assists': 3.5, 'threes': 1.5, 'PRA': 15.5}
MIN_MINUTES = 22
MIN_SAMPLE = 3
SHRINK = 4


def half_line(value):
    """10.2 -> 10.5, 10.7 -> 10.5, 10.0 -> 10.5 (never a whole number, so no pushes)."""
    return math.floor(value) + .5


def prop_chances(player):
    """{metric: {line, over, under}} for the markets a player qualifies for."""
    draws = player.get('draws') or []
    if len(draws) < MIN_SAMPLE or player.get('minutes', 0) < MIN_MINUTES:
        return {}
    out = {}
    for metric in LOOK_MARKETS:
        average = (player.get('average') or {}).get(metric)
        if average is None:
            continue
        line = half_line(average)
        if line < MIN_LINE[metric]:
            continue
        values = [d[metric] for d in draws if metric in d]
        if len(values) < MIN_SAMPLE:
            continue
        over = sum(v > line for v in values)
        chance = (over + SHRINK * .5) / (len(values) + SHRINK)
        out[metric] = dict(line=line, over=round(chance, 3), under=round(1 - chance, 3))
    return out


def pick_looks(games, count=8):
    """Best side per player across a day's games, ranked by chance."""
    best = {}
    for game in games:
        for player in game.get('roster', []):
            for metric, quote in (player.get('props') or {}).items():
                for side in ('over', 'under'):
                    chance = quote[side]
                    key = player['id']
                    if key not in best or chance > best[key]['prob']:
                        best[key] = dict(game=game['id'], time=game['time'], pid=player['id'], name=player['name'],
                                         team=player['team'], metric=metric, side=side, line=quote['line'],
                                         prob=chance, projection=player.get('estimate', {}).get(metric))
    def gap(r):  # ties (common with few games) go to the bigger projection gap vs the line
        projection = r['projection'] if r['projection'] is not None else r['line']
        return abs(projection - r['line']) / max(r['line'], 1)
    ranked = sorted(best.values(), key=lambda r: (-r['prob'], -gap(r), r['name']))[:count]
    for rank, row in enumerate(ranked, 1):
        row['rank'] = rank
    return ranked
