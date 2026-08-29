"""Hermes Telegram adapter override with native DINKFRAME review buttons."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
import sys

from plugins.platforms.telegram import adapter as base
from telegram import ForceReply, InlineKeyboardButton, InlineKeyboardMarkup

from . import actions


logger = logging.getLogger(__name__)
PROJECT_DIR = Path(r"C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0")
DECISION_SCRIPT = PROJECT_DIR / "hermes" / "dinkframe-decision.py"


class DinkframeTelegramAdapter(base.TelegramAdapter):
    async def _handle_callback_query(self, update, context) -> None:
        query = update.callback_query
        data = getattr(query, "data", "") if query else ""
        if data.startswith("df:"):
            await self._handle_dinkframe_callback(query, data)
            return
        await super()._handle_callback_query(update, context)

    async def _handle_dinkframe_callback(self, query, data: str) -> None:
        parts = data.split(":", 2)
        if len(parts) != 3 or parts[1] not in {"a", "r", "c"}:
            await query.answer(text="Invalid DINKFRAME action.")
            return

        caller_id = str(getattr(query.from_user, "id", ""))
        owner_id = get_owner_id()
        message = getattr(query, "message", None)
        chat = getattr(message, "chat", None)
        chat_id = str(getattr(message, "chat_id", ""))
        if not owner_id or caller_id != owner_id or chat_id != owner_id:
            await query.answer(text="⛔ Only the DINKFRAME owner can use this button.")
            return

        try:
            action = actions.load_action(parts[2])
        except actions.InvalidAction as exc:
            await query.answer(text=str(exc), show_alert=True)
            await self._mark_card_resolved(query, str(exc), "⌛")
            return

        if parts[1] == "r":
            actions.start_revision(action["actionId"], owner_id, chat_id)
            await query.answer(text="Send your revision feedback next.")
            await self._remove_card_buttons(query)
            if self._bot:
                await self._bot.send_message(
                    chat_id=int(chat_id),
                    text=(
                        f"✏️ {action['orderLabel']} — what should change?\n\n"
                        "Reply with the exact feedback for the designer. "
                        "Send /cancel to return to the review buttons."
                    ),
                    reply_markup=ForceReply(
                        selective=True,
                        input_field_placeholder="Describe the changes…",
                    ),
                )
            return

        decision = "approve" if parts[1] == "a" else "cancel"
        await query.answer(text="Applying DINKFRAME decision…")
        success, result = await run_decision(action, decision)
        if success:
            actions.consume_action(action["actionId"])
            actions.clear_pending_revision(owner_id)
            icon = "✅" if decision == "approve" else "❌"
            await self._mark_card_resolved(query, result, icon)
        elif self._bot:
            await self._bot.send_message(
                chat_id=int(chat_id),
                text=f"⚠️ {result}\n\nThe review buttons remain available.",
            )

    async def handle_dinkframe_revision(
        self,
        *,
        owner_id: str,
        chat_id: str,
        feedback: str,
        action_id: str,
    ) -> None:
        try:
            action = actions.load_action(action_id)
        except actions.InvalidAction as exc:
            actions.clear_pending_revision(owner_id)
            await self._send_plain(chat_id, f"⌛ {exc}")
            return

        normalized = feedback.strip()
        if normalized.lower() in {"/cancel", "cancel revision"}:
            actions.clear_pending_revision(owner_id)
            await self._send_decision_card(chat_id, action)
            return
        if len(normalized) < 3:
            await self._send_plain(
                chat_id,
                "Please describe the requested change, or send /cancel to return.",
            )
            return
        if len(normalized) > 2000:
            await self._send_plain(
                chat_id,
                "Revision feedback must be 2,000 characters or fewer.",
            )
            return

        await self._send_plain(chat_id, "Submitting your revision feedback…")
        success, result = await run_decision(action, "revise", normalized)
        if success:
            actions.clear_pending_revision(owner_id)
            actions.consume_action(action_id)
            await self._send_plain(chat_id, f"✏️ {result}")
        else:
            await self._send_plain(
                chat_id,
                f"⚠️ {result}\n\nYour feedback is still pending; resend it or use /cancel.",
            )

    async def _send_decision_card(self, chat_id: str, action: dict[str, str]) -> None:
        if not self._bot:
            return
        message_id = action.get("messageId", "")
        if message_id.isdigit():
            try:
                await self._bot.edit_message_reply_markup(
                    chat_id=int(chat_id),
                    message_id=int(message_id),
                    reply_markup=decision_keyboard(action["actionId"]),
                )
                await self._send_plain(chat_id, "Review buttons restored.")
                return
            except Exception:
                logger.debug("Could not restore buttons on the original message", exc_info=True)
        await self._bot.send_message(
            chat_id=int(chat_id),
            text=decision_card_text(action),
            reply_markup=decision_keyboard(action["actionId"]),
        )

    async def _send_plain(self, chat_id: str, text: str) -> None:
        if self._bot:
            await self._bot.send_message(chat_id=int(chat_id), text=text)

    async def _mark_card_resolved(self, query, result: str, icon: str) -> None:
        await self._remove_card_buttons(query)
        message = getattr(query, "message", None)
        chat_id = str(getattr(message, "chat_id", ""))
        if chat_id:
            await self._send_plain(chat_id, f"{icon} {result}")

    async def _remove_card_buttons(self, query) -> None:
        try:
            await query.edit_message_reply_markup(reply_markup=None)
        except Exception:
            logger.debug("Could not remove DINKFRAME review buttons", exc_info=True)


async def run_decision(
    action: dict[str, str],
    decision: str,
    feedback: str = "",
) -> tuple[bool, str]:
    command = [
        sys.executable,
        str(DECISION_SCRIPT),
        action["jobId"],
        action["approvalToken"],
        decision,
    ]
    if feedback:
        command.append(feedback)
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            cwd=str(PROJECT_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=40)
    except (OSError, asyncio.TimeoutError):
        return False, "DINKFRAME could not reach the approval service."
    output = (stdout if process.returncode == 0 else stderr).decode(
        "utf-8", errors="replace"
    ).strip()
    if not output:
        output = (
            "DINKFRAME decision applied."
            if process.returncode == 0
            else "The DINKFRAME decision was rejected."
        )
    return process.returncode == 0, output


def decision_keyboard(action_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("✅ Approve", callback_data=f"df:a:{action_id}"),
                InlineKeyboardButton("✏️ Revise", callback_data=f"df:r:{action_id}"),
            ],
            [InlineKeyboardButton("❌ Cancel", callback_data=f"df:c:{action_id}")],
        ]
    )


def decision_card_text(action: dict[str, str]) -> str:
    label = "PROMPT" if action["stage"] == "prompt_generation" else "IMAGE"
    return (
        f"DINKFRAME {action['orderLabel']} — {label} REVIEW\n\n"
        "Choose one option below. Each button is owner-only and can be used once."
    )


def _build_adapter(config):
    adapter = DinkframeTelegramAdapter(config)
    try:
        adapter._notifications_mode = base._resolve_notifications_mode()
    except Exception:
        adapter._notifications_mode = "important"
    return adapter


def pre_gateway_dispatch(event, gateway, **kwargs):
    source = getattr(event, "source", None)
    platform = getattr(getattr(source, "platform", None), "value", "")
    owner_id = get_owner_id()
    sender_id = str(getattr(source, "user_id", ""))
    chat_id = str(getattr(source, "chat_id", ""))
    if platform != "telegram" or not owner_id or sender_id != owner_id:
        return None
    pending = actions.load_pending_revision(owner_id)
    if not pending:
        return None

    adapter = next(
        (
            value
            for key, value in gateway.adapters.items()
            if getattr(key, "value", str(key)) == "telegram"
        ),
        None,
    )
    if not isinstance(adapter, DinkframeTelegramAdapter):
        return None
    feedback = str(getattr(event, "text", "") or "")
    asyncio.get_running_loop().create_task(
        adapter.handle_dinkframe_revision(
            owner_id=owner_id,
            chat_id=chat_id,
            feedback=feedback,
            action_id=pending["actionId"],
        )
    )
    return {"action": "skip", "reason": "dinkframe-revision-feedback"}


def register(ctx) -> None:
    ctx.register_platform(
        name="telegram",
        label="Telegram + DINKFRAME",
        adapter_factory=_build_adapter,
        check_fn=base.check_telegram_requirements,
        is_connected=base._is_connected,
        required_env=["TELEGRAM_BOT_TOKEN"],
        install_hint="Uses the existing Hermes Telegram installation.",
        setup_fn=base.interactive_setup,
        apply_yaml_config_fn=base._apply_yaml_config,
        allowed_users_env="TELEGRAM_ALLOWED_USERS",
        allow_all_env="TELEGRAM_ALLOW_ALL_USERS",
        cron_deliver_env_var="TELEGRAM_HOME_CHANNEL",
        standalone_sender_fn=base._standalone_send,
        max_message_length=4096,
        emoji="🎨",
        allow_update_command=True,
    )
    ctx.register_hook("pre_gateway_dispatch", pre_gateway_dispatch)


def get_owner_id() -> str:
    configured = os.getenv("DINKFRAME_TELEGRAM_OWNER_ID", "").strip()
    if configured:
        return configured
    try:
        from hermes_cli.config import load_config

        value = load_config().get("dinkframe", {}).get("telegram_owner_id", "")
        return str(value).strip()
    except Exception:
        return ""


__all__ = ["register", "DinkframeTelegramAdapter"]
