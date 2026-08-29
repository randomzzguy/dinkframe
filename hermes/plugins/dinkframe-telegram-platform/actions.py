"""Durable local state for DINKFRAME Telegram decision buttons."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any


PROJECT_DIR = Path(r"C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0")
ACTION_ROOT = PROJECT_DIR / ".dinkframe" / "telegram-actions"
ACTION_ID_PATTERN = re.compile(r"^[0-9a-f]{32}$")
JOB_ID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
TOKEN_PATTERN = re.compile(r"^[0-9a-f]{48}$", re.IGNORECASE)
ACTION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
REVISION_MAX_AGE_SECONDS = 60 * 60


class InvalidAction(ValueError):
    pass


def load_action(action_id: str) -> dict[str, str]:
    path = action_path(action_id)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        raise InvalidAction("This review has expired or was already resolved.") from exc

    required = {
        "actionId": action_id,
        "jobId": value.get("jobId"),
        "approvalToken": value.get("approvalToken"),
        "stage": value.get("stage"),
        "orderLabel": value.get("orderLabel"),
        "createdAt": value.get("createdAt"),
        "messageId": value.get("messageId", ""),
    }
    if JOB_ID_PATTERN.fullmatch(str(required["jobId"])) is None:
        raise InvalidAction("This review action is invalid.")
    if TOKEN_PATTERN.fullmatch(str(required["approvalToken"])) is None:
        raise InvalidAction("This review action is invalid.")
    if required["stage"] not in {"prompt_generation", "image_generation"}:
        raise InvalidAction("This review action is invalid.")
    if not isinstance(required["orderLabel"], str) or not required["orderLabel"]:
        raise InvalidAction("This review action is invalid.")
    if required["messageId"] and not str(required["messageId"]).isdigit():
        raise InvalidAction("This review action is invalid.")
    if age_seconds(str(required["createdAt"])) > ACTION_MAX_AGE_SECONDS:
        consume_action(action_id)
        raise InvalidAction("This review has expired. Start a fresh review from DINKFRAME.")
    return {key: str(item) for key, item in required.items()}


def consume_action(action_id: str) -> None:
    action_path(action_id).unlink(missing_ok=True)


def start_revision(action_id: str, owner_id: str, chat_id: str) -> None:
    load_action(action_id)
    write_json_atomic(
        pending_path(owner_id),
        {
            "actionId": action_id,
            "ownerId": owner_id,
            "chatId": chat_id,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        },
    )


def load_pending_revision(owner_id: str) -> dict[str, str] | None:
    path = pending_path(owner_id)
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        path.unlink(missing_ok=True)
        return None
    if value.get("ownerId") != owner_id:
        path.unlink(missing_ok=True)
        return None
    try:
        if age_seconds(str(value.get("createdAt", ""))) > REVISION_MAX_AGE_SECONDS:
            path.unlink(missing_ok=True)
            return None
        load_action(str(value.get("actionId", "")))
    except InvalidAction:
        path.unlink(missing_ok=True)
        return None
    return {
        "actionId": str(value["actionId"]),
        "ownerId": owner_id,
        "chatId": str(value.get("chatId", "")),
        "createdAt": str(value["createdAt"]),
    }


def clear_pending_revision(owner_id: str) -> None:
    pending_path(owner_id).unlink(missing_ok=True)


def action_path(action_id: str) -> Path:
    if ACTION_ID_PATTERN.fullmatch(action_id) is None:
        raise InvalidAction("This review action is invalid.")
    return ACTION_ROOT / f"{action_id}.json"


def pending_path(owner_id: str) -> Path:
    safe_owner_id = re.sub(r"[^0-9]", "", owner_id)
    if not safe_owner_id or safe_owner_id != owner_id:
        raise InvalidAction("The Telegram owner ID is invalid.")
    return ACTION_ROOT / f"pending-{safe_owner_id}.json"


def write_json_atomic(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        f"{json.dumps(value, ensure_ascii=False, indent=2)}\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def age_seconds(value: str) -> float:
    try:
        created = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise InvalidAction("This review action is invalid.") from exc
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return max(0.0, (datetime.now(timezone.utc) - created).total_seconds())
