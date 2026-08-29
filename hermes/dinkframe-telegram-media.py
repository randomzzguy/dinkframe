"""Send one DINKFRAME review image through the configured Hermes Telegram bot."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from hermes_cli.gateway import get_env_value
from telegram import Bot


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

    async with Bot(token=token) as bot:
        with image_path.open("rb") as image_file:
            message = await bot.send_photo(
                chat_id=int(chat_id),
                photo=image_file,
                caption=caption,
            )
    print(json.dumps({"success": True, "message_id": str(message.message_id)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
