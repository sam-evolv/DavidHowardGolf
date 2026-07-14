import unittest
from pathlib import Path


class LiveModuleContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (Path(__file__).resolve().parents[1] / "live.js").read_text()

    def test_does_not_treat_generic_espn_as_canonical_score_source(self):
        self.assertNotIn("site.api.espn.com", self.source)

    def test_displays_verification_time_and_source_link(self):
        self.assertIn("lv-verified", self.source)
        self.assertIn("sourceUpdatedAt", self.source)
        self.assertIn("sourceUrl", self.source)

    def test_refreshes_live_and_week_data_without_a_page_reload(self):
        self.assertIn("refreshLive", self.source)
        self.assertIn("refreshWeek", self.source)
        self.assertIn("15000", self.source)
        self.assertIn("60000", self.source)
        self.assertIn("scheduleLiveRefresh", self.source)

    def test_keeps_following_information_and_calendar_handoff(self):
        self.assertIn("Sky Sports Golf", self.source)
        self.assertIn("Add his tee time to your calendar", self.source)

    def test_renders_an_update_timeline_from_verified_events(self):
        self.assertIn("lv-timeline", self.source)
        self.assertIn("updates", self.source)


if __name__ == "__main__":
    unittest.main()
