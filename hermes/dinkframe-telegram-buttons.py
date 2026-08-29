"""Send a native DINKFRAME decision card through the existing Hermes bot."""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys

from hermes_cli.gateway import get_env_value
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup


ACTION_ID_PATTERN = re.compile(r"^[0-9a-f]{32}$")


async def main() -> int:
    token = os.getenv("TELEGRAM_BOT_TOKEN") or get_env_value("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_HOME_CHANNEL") or get_env_value(
        "TELEGRAM_HOME_CHANNEL"
    )
    if not token or not chat_id:
        print("Hermes Telegram delivery is not configured.", file=sys.stderr)
        return 1
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        print("DINKFRAME Telegram button delivery is configured.")
        return 0

    try:
        payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        print("Invalid DINKFRAME Telegram payload.", file=sys.stderr)
        return 1

    action_id = str(payload.get("actionId", ""))
    order_label = str(payload.get("orderLabel", "")).strip()
    stage = str(payload.get("stage", ""))
    message_id = str(payload.get("messageId", "")).strip()
    if ACTION_ID_PATTERN.fullmatch(action_id) is None:
        print("Invalid DINKFRAME Telegram action ID.", file=sys.stderr)
        return 1
    if not order_label or stage not in {"prompt_generation", "image_generation"}:
        print("Invalid DINKFRAME Telegram review details.", file=sys.stderr)
        return 1

    label = "PROMPT" if stage == "prompt_generation" else "IMAGE"
    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"df:a:{action_id}"),
                InlineKeyboardButton("✏️ Revise", callback_data=f"df:r:{action_id}"),
            ],
            [InlineKeyboardButton("❌ Cancel", callback_data=f"df:c:{action_id}")],
        ]
    )
    async with Bot(token=token) as bot:
        if message_id.isdigit():
            await bot.edit_message_reply_markup(
                chat_id=int(chat_id),
                message_id=int(message_id),
                reply_markup=keyboard,
            )
            print(f"Attached DINKFRAME review buttons to {message_id}.")
        else:
            message = await bot.send_message(
                chat_id=int(chat_id),
                text=(
                    f"DINKFRAME {order_label} — {label} REVIEW\n\n"
                    "Choose one option below. Each button is owner-only and can be used once."
                ),
                reply_markup=keyboard,
            )
            print(f"Sent DINKFRAME review card {message.message_id}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
