import json
import unittest
from datetime import datetime, timezone
from pathlib import Path

from scripts.validate_live_data import validate_live_state, validate_week_state


class LiveDataValidationTests(unittest.TestCase):
    def test_active_round_requires_verifiable_source_and_timestamps(self):
        state = {
            "schemaVersion": 1,
            "active": True,
            "state": "on_course",
            "score": "-1",
            "position": "T23",
            "thru": "12",
            "today": "-1",
            "source": "official-open",
            "sourceUrl": "https://www.theopen.com/leaderboard",
            "sourceUpdatedAt": "2026-07-16T12:22:00Z",
            "checkedAt": "2026-07-16T12:22:18Z",
            "publishedAt": "2026-07-16T12:22:18Z",
            "updates": [],
        }
        self.assertEqual(validate_live_state(state), [])

    def test_live_insights_must_be_structured_when_present(self):
        state = {
            "schemaVersion": 1,
            "active": True,
            "state": "on_course",
            "source": "official-open",
            "sourceUrl": "https://www.theopen.com/leaderboard",
            "sourceUpdatedAt": "2026-07-16T12:22:00Z",
            "checkedAt": "2026-07-16T12:22:18Z",
            "publishedAt": "2026-07-16T12:22:18Z",
            "insights": [{"label": "Projected cut", "value": "Inside by three"}],
        }
        self.assertEqual(validate_live_state(state), [])
        state["insights"] = [{"label": "Projected cut"}]
        self.assertIn("insights[0] must include text label and value", validate_live_state(state))

    def test_active_round_rejects_missing_freshness_evidence(self):
        state = {
            "schemaVersion": 1,
            "active": True,
            "state": "on_course",
            "score": "E",
            "source": "official-open",
            "sourceUrl": "",
            "sourceUpdatedAt": "",
            "checkedAt": "",
            "publishedAt": "",
        }
        errors = validate_live_state(state)
        self.assertIn("sourceUrl is required while active", errors)
        self.assertIn("sourceUpdatedAt must be an ISO-8601 timestamp while active", errors)
        self.assertIn("checkedAt must be an ISO-8601 timestamp while active", errors)
        self.assertIn("publishedAt must be an ISO-8601 timestamp while active", errors)

    def test_inactive_state_can_remain_empty_but_needs_schema_version(self):
        self.assertEqual(
            validate_live_state({"schemaVersion": 1, "active": False}), [],
        )
        self.assertIn(
            "schemaVersion must equal 1",
            validate_live_state({"active": False}),
        )

    def test_week_requires_update_timestamp_and_known_statuses(self):
        week = {
            "enabled": True,
            "lifecycle": "pre_event",
            "updatedAt": "2026-07-16T12:22:18Z",
            "days": [{"id": "r1", "status": "live"}],
        }
        self.assertEqual(validate_week_state(week), [])
        errors = validate_week_state({"days": [{"id": "r1", "status": "maybe"}]})
        self.assertIn("enabled must be a boolean", errors)
        self.assertIn("lifecycle must be one of: pre_event, live, complete", errors)
        self.assertIn("updatedAt must be an ISO-8601 timestamp", errors)
        self.assertIn("days[0].status must be one of: upcoming, live, done", errors)

    def test_repository_live_files_pass_the_deployment_gate(self):
        root = Path(__file__).resolve().parents[1]
        live = json.loads((root / "live.json").read_text())
        week = json.loads((root / "week.json").read_text())
        self.assertEqual(validate_live_state(live), [])
        self.assertEqual(validate_week_state(week), [])


if __name__ == "__main__":
    unittest.main()
