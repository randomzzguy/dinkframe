"""Deterministically route signed DINKFRAME decisions from the owner Telegram DM."""

from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import sys
from typing import Any


PROJECT_DIR = Path(r"C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0")
DECISION_SCRIPT = PROJECT_DIR / "hermes" / "dinkframe-decision.py"
OWNER_TELEGRAM_ID = "5831954523"
UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
HEX_CHUNK_PATTERN = re.compile(r"^[0-9a-f]+$", re.IGNORECASE)
TOKEN_LENGTH = 48


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        emit({})
        return 0

    extra = payload.get("extra") if isinstance(payload.get("extra"), dict) else {}
    platform = str(extra.get("platform", payload.get("platform", ""))).lower()
    sender_id = str(extra.get("sender_id", payload.get("sender_id", "")))
    message = extra.get("user_message", payload.get("user_message", ""))

    if platform != "telegram" or sender_id != OWNER_TELEGRAM_ID:
        emit({})
        return 0

    parsed = parse_decision(str(message))
    if parsed is None:
        emit({})
        return 0

    decision, job_id, approval_token, feedback = parsed
    command = [
        sys.executable,
        str(DECISION_SCRIPT),
        job_id,
        approval_token,
        decision,
    ]
    if feedback:
        command.append(feedback)

    result = subprocess.run(
        command,
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=40,
        check=False,
    )
    output = (result.stdout if result.returncode == 0 else result.stderr).strip()
    if not output:
        output = (
            "DINKFRAME decision applied."
            if result.returncode == 0
            else "The DINKFRAME decision was rejected."
        )

    outcome = "succeeded" if result.returncode == 0 else "failed"
    emit(
        {
            "context": (
                "DINKFRAME deterministic Telegram decision handler already ran. "
                f"The action {outcome}. Reply with exactly this result and do not "
                f"call tools or claim a different outcome:\n{output}"
            )
        }
    )
    return 0


def parse_decision(message: str) -> tuple[str, str, str, str] | None:
    parts = re.split(r"\s+", message.strip())
    if len(parts) < 3:
        return None

    action = parts[0].upper()
    if action not in {"APPROVE", "REVISE", "CANCEL"}:
        return None

    job_id = parts[1]
    if UUID_PATTERN.fullmatch(job_id) is None:
        return None

    token_chunks: list[str] = []
    token_length = 0
    remainder_index = 2
    for index, part in enumerate(parts[2:], start=2):
        if HEX_CHUNK_PATTERN.fullmatch(part) is None:
            break
        if token_length + len(part) > TOKEN_LENGTH:
            return None
        token_chunks.append(part)
        token_length += len(part)
        remainder_index = index + 1
        if token_length == TOKEN_LENGTH:
            break

    if token_length != TOKEN_LENGTH:
        return None

    approval_token = "".join(token_chunks)
    remainder = parts[remainder_index:]
    if action in {"APPROVE", "CANCEL"} and remainder:
        return None
    if action == "REVISE" and not remainder:
        return None

    feedback = " ".join(remainder)
    return action.lower(), job_id, approval_token, feedback


def emit(value: dict[str, Any]) -> None:
    print(json.dumps(value, ensure_ascii=False))


if __name__ == "__main__":
    raise SystemExit(main())
