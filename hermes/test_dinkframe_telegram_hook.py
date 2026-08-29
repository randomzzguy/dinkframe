import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).with_name("dinkframe-telegram-hook.py")
SPEC = importlib.util.spec_from_file_location("dinkframe_telegram_hook", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
HOOK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HOOK)


class ParseDecisionTests(unittest.TestCase):
    job_id = "b0147937-263f-4a4d-a316-6e7337ef17bd"
    token = "a" * 48

    def test_parses_single_line_approval(self):
        self.assertEqual(
            HOOK.parse_decision(f"APPROVE {self.job_id} {self.token}"),
            ("approve", self.job_id, self.token, ""),
        )

    def test_reassembles_telegram_wrapped_token(self):
        wrapped = f"APPROVE {self.job_id}\n{self.token[:34]}\n{self.token[34:]}"
        self.assertEqual(
            HOOK.parse_decision(wrapped),
            ("approve", self.job_id, self.token, ""),
        )

    def test_preserves_revision_feedback(self):
        message = f"REVISE {self.job_id} {self.token} make the title larger"
        self.assertEqual(
            HOOK.parse_decision(message),
            ("revise", self.job_id, self.token, "make the title larger"),
        )

    def test_rejects_incomplete_token(self):
        self.assertIsNone(
            HOOK.parse_decision(f"APPROVE {self.job_id} {self.token[:-1]}")
        )

    def test_rejects_extra_approval_text(self):
        self.assertIsNone(
            HOOK.parse_decision(f"APPROVE {self.job_id} {self.token} yes")
        )


if __name__ == "__main__":
    unittest.main()
