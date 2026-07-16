import json
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ScheduleConsistencyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.week = json.loads((ROOT / "week.json").read_text(encoding="utf-8"))
        cls.live_source = (ROOT / "live.js").read_text(encoding="utf-8")
        cls.html_source = (ROOT / "index.html").read_text(encoding="utf-8")

    def round(self, round_id):
        return next(day for day in self.week["days"] if day["id"] == round_id)

    def test_official_round_times_are_machine_readable_and_correct(self):
        self.assertEqual(self.round("r1")["teeTime"], "2026-07-16T10:42:00+01:00")
        self.assertEqual(self.round("r2")["teeTime"], "2026-07-17T15:48:00+01:00")

    def test_stale_one_group_late_times_are_absent(self):
        public_sources = "\n".join((
            json.dumps(self.week),
            self.live_source,
            self.html_source,
        ))
        self.assertNotIn("10:53", public_sources)
        self.assertNotIn("15:59", public_sources)

    def test_countdown_matches_round_one_source_of_truth(self):
        tee_time = self.round("r1")["teeTime"]
        self.assertIn(f"new Date('{tee_time}')", self.html_source)
        self.assertIn("Thursday 10:42", self.html_source)

    def test_follow_panel_and_calendar_are_derived_from_schedule_data(self):
        self.assertIn("renderFollow(data)", self.live_source)
        self.assertIn("day.teeTime", self.live_source)
        self.assertNotRegex(self.live_source, r"His group</b>\d{1,2}:\d{2}")

        tee_time = datetime.fromisoformat(self.round("r1")["teeTime"])
        expected_utc = tee_time.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        self.assertEqual(expected_utc, "20260716T094200Z")


if __name__ == "__main__":
    unittest.main()
