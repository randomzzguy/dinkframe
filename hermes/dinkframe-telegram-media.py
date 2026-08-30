"""Send one DINKFRAME review image through the configured Hermes Telegram bot."""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from pathlib import Path

from hermes_cli.gateway import get_env_value
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.request import HTTPXRequest


ACTION_ID_PATTERN = re.compile(r"^[0-9a-f]{32}$")


async def main() -> int:
    token = os.getenv("TELEGRAM_BOT_TOKEN") or get_env_value("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_HOME_CHANNEL") or get_env_value(
        "TELEGRAM_HOME_CHANNEL"
    )
    if not token or not chat_id:
        print("Hermes Telegram delivery is not configured.", file=sys.stderr)
        return 1

    try:
        payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        print("Invalid DINKFRAME Telegram media payload.", file=sys.stderr)
        return 1

    image_path = Path(str(payload.get("imagePath", ""))).resolve()
    caption = str(payload.get("caption", "")).strip()
    action_id = str(payload.get("actionId", ""))
    if not image_path.is_file() or image_path.suffix.lower() not in {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
    }:
        print("Invalid DINKFRAME review image.", file=sys.stderr)
        return 1
    if not caption:
        print("DINKFRAME image caption is required.", file=sys.stderr)
        return 1
    if ACTION_ID_PATTERN.fullmatch(action_id) is None:
        print("Invalid DINKFRAME Telegram action ID.", file=sys.stderr)
        return 1

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"df:a:{action_id}"),
                InlineKeyboardButton("✏️ Revise", callback_data=f"df:r:{action_id}"),
            ],
            [InlineKeyboardButton("❌ Cancel", callback_data=f"df:c:{action_id}")],
        ]
    )
    request = HTTPXRequest(
        connect_timeout=20,
        read_timeout=90,
        write_timeout=90,
        pool_timeout=20,
        media_write_timeout=120,
    )
    async with Bot(token=token, request=request) as bot:
        with image_path.open("rb") as image_file:
            message = await bot.send_photo(
                chat_id=int(chat_id),
                photo=image_file,
                caption=caption,
                reply_markup=keyboard,
            )
    print(json.dumps({"success": True, "message_id": str(message.message_id)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
