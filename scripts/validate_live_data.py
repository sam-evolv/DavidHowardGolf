"""Deployment gate for David Howard Golf Championship-week live data."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

ISO_FIELDS = ("sourceUpdatedAt", "checkedAt", "publishedAt")
WEEK_STATUSES = {"upcoming", "live", "done"}


def _is_iso_timestamp(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def validate_live_state(state: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if state.get("schemaVersion") != 1:
        errors.append("schemaVersion must equal 1")
    if not isinstance(state.get("active"), bool):
        errors.append("active must be a boolean")
        return errors
    if not state["active"]:
        return errors

    if state.get("state") not in {"on_course", "round_complete"}:
        errors.append("state must be on_course or round_complete while active")
    if not isinstance(state.get("source"), str) or not state["source"]:
        errors.append("source is required while active")
    if not isinstance(state.get("sourceUrl"), str) or not state["sourceUrl"].startswith("https://"):
        errors.append("sourceUrl is required while active")
    for field in ISO_FIELDS:
        if not _is_iso_timestamp(state.get(field)):
            errors.append(f"{field} must be an ISO-8601 timestamp while active")
    if "updates" in state and not isinstance(state["updates"], list):
        errors.append("updates must be a list when present")
    return errors


def validate_week_state(week: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    if not isinstance(week.get("enabled"), bool):
        errors.append("enabled must be a boolean")
    if week.get("lifecycle") not in {"pre_event", "live", "complete"}:
        errors.append("lifecycle must be one of: pre_event, live, complete")
    if not _is_iso_timestamp(week.get("updatedAt")):
        errors.append("updatedAt must be an ISO-8601 timestamp")
    days = week.get("days")
    if not isinstance(days, list):
        return errors + ["days must be a list"]
    for index, day in enumerate(days):
        if not isinstance(day, dict) or day.get("status") not in WEEK_STATUSES:
            errors.append(f"days[{index}].status must be one of: upcoming, live, done")
    return errors
