import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from cbb_looks import half_line, prop_chances, pick_looks


def player(pid, points, avg=14.0, minutes=30):
    draws = [dict(points=v, rebounds=2, assists=1, threes=0, PRA=v + 3) for v in points]
    return dict(id=pid, name='P' + pid, team='1', minutes=minutes, draws=draws,
                average=dict(points=avg, rebounds=2.0, assists=1.0, threes=0.4, PRA=avg + 3),
                estimate=dict(points=sum(points) / len(points)))


class CbbLooksTests(unittest.TestCase):
    def test_half_line(self):
        self.assertEqual([half_line(10.2), half_line(10.9), half_line(10.0)], [10.5, 10.5, 10.5])

    def test_chance_is_shrunk_and_small_lines_skipped(self):
        props = prop_chances(player('1', [20, 20, 20, 20, 20, 20]))
        self.assertEqual(set(props), {'points', 'PRA'})
        self.assertEqual(props['points']['line'], 14.5)
        self.assertAlmostEqual(props['points']['over'], (6 + 2) / 10)
        self.assertAlmostEqual(props['points']['under'], 1 - props['points']['over'])

    def test_bench_players_and_thin_samples_left_out(self):
        self.assertEqual(prop_chances(player('1', [20] * 6, minutes=12)), {})
        self.assertEqual(prop_chances(player('1', [20, 20])), {})

    def test_one_pick_per_player_ranked_by_chance(self):
        a, b = player('a', [20] * 10), player('b', [5] * 6 + [20] * 4)
        for p in (a, b):
            p['props'] = prop_chances(p)
        looks = pick_looks([dict(id='g', time='2026-11-18T00:00Z', roster=[a, b])])
        self.assertEqual([l['pid'] for l in looks], ['a', 'b'])
        self.assertEqual(looks[1]['side'], 'under')
        self.assertEqual([l['rank'] for l in looks], [1, 2])


if __name__ == '__main__':
    unittest.main()
