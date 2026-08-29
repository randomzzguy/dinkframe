from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ACTIONS_PATH = (
    Path(__file__).parent
    / "plugins"
    / "dinkframe-telegram-platform"
    / "actions.py"
)
SPEC = importlib.util.spec_from_file_location("dinkframe_button_actions", ACTIONS_PATH)
assert SPEC is not None and SPEC.loader is not None
ACTIONS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ACTIONS)


class DinkframeButtonActionTests(unittest.TestCase):
    action_id = "a" * 32
    owner_id = "5831954523"

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.original_root = ACTIONS.ACTION_ROOT
        ACTIONS.ACTION_ROOT = Path(self.temporary.name)

    def tearDown(self):
        ACTIONS.ACTION_ROOT = self.original_root
        self.temporary.cleanup()

    def write_action(self, created_at=None):
        value = {
            "actionId": self.action_id,
            "jobId": "b0147937-263f-4a4d-a316-6e7337ef17bd",
            "approvalToken": "b" * 48,
            "stage": "prompt_generation",
            "orderLabel": "DF-2026-0003",
            "createdAt": created_at or datetime.now(timezone.utc).isoformat(),
            "messageId": "12345",
        }
        ACTIONS.write_json_atomic(ACTIONS.action_path(self.action_id), value)
        return value

    def test_loads_a_valid_action(self):
        value = self.write_action()
        self.assertEqual(ACTIONS.load_action(self.action_id)["jobId"], value["jobId"])

    def test_callback_payload_stays_under_telegram_limit(self):
        for choice in ("a", "r", "c"):
            self.assertLessEqual(len(f"df:{choice}:{self.action_id}".encode()), 64)

    def test_rejects_path_traversal_action_id(self):
        with self.assertRaises(ACTIONS.InvalidAction):
            ACTIONS.load_action("../secret")

    def test_rejects_invalid_message_id(self):
        value = self.write_action()
        value["messageId"] = "12-not-valid"
        ACTIONS.write_json_atomic(ACTIONS.action_path(self.action_id), value)
        with self.assertRaises(ACTIONS.InvalidAction):
            ACTIONS.load_action(self.action_id)

    def test_expired_action_is_removed(self):
        old = datetime.now(timezone.utc) - timedelta(days=8)
        self.write_action(old.isoformat())
        with self.assertRaises(ACTIONS.InvalidAction):
            ACTIONS.load_action(self.action_id)
        self.assertFalse(ACTIONS.action_path(self.action_id).exists())

    def test_revision_pending_state_round_trip(self):
        self.write_action()
        ACTIONS.start_revision(self.action_id, self.owner_id, self.owner_id)
        pending = ACTIONS.load_pending_revision(self.owner_id)
        self.assertIsNotNone(pending)
        self.assertEqual(pending["actionId"], self.action_id)
        ACTIONS.clear_pending_revision(self.owner_id)
        self.assertIsNone(ACTIONS.load_pending_revision(self.owner_id))


if __name__ == "__main__":
    unittest.main()
