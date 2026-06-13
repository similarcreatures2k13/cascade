"""Cascade shared SimpleAdapter implementation.

Wraps an OpenAI-compatible LLM (via OpenRouter) and exposes Band's
platform tools to it via OpenAI function-calling. The LLM decides when
to send_message, lookup_peers, add_participant, etc.

Each Cascade agent (triage, regulatory, hipaa-specialist) instantiates
this with a role-specific system prompt and model choice.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from openai import AsyncOpenAI

from band import (
    AdapterFeatures,
    Capability,
    Emit,
    PlatformMessage,
)
from band.agent import SimpleAdapter

logger = logging.getLogger("cascade.adapter")


class CascadeAdapter(SimpleAdapter[list[dict[str, Any]]]):
    """LLM-driven adapter with Band platform tools.

    History is provided as a plain list of OpenAI-format chat messages,
    so we don't need a history_converter — Band's raw history is close
    enough for our purposes.
    """

    SUPPORTED_EMIT = frozenset({Emit.EXECUTION})
    SUPPORTED_CAPABILITIES = frozenset({Capability.CONTACTS})

    def __init__(self, *, system_prompt: str, model: str) -> None:
        super().__init__(
            features=AdapterFeatures(
                emit=frozenset({Emit.EXECUTION}),
                capabilities=frozenset({Capability.CONTACTS}),
            ),
        )
        self.system_prompt = system_prompt
        self.model = model
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        )

    async def on_message(
        self,
        msg: PlatformMessage,
        tools: Any,
        history: Any,
        participants_msg: str | None,
        contacts_msg: str | None,
        *,
        is_session_bootstrap: bool,
        room_id: str,
    ) -> None:
        """Run one LLM turn when the agent is @mentioned."""

        # Build the conversation context for the LLM
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt},
        ]

        if participants_msg:
            messages.append({"role": "system", "content": f"Participants: {participants_msg}"})
        if contacts_msg:
            messages.append({"role": "system", "content": f"Contacts: {contacts_msg}"})

        # Add the formatted incoming message
        try:
            user_text = msg.format_for_llm()
        except Exception:
            user_text = str(getattr(msg, "body", msg))
        messages.append({"role": "user", "content": user_text})

        # Get Band platform tool schemas in OpenAI format
        tool_schemas = tools.get_openai_tool_schemas(
            include_memory=False,
            include_contacts=True,
        )

        # Tool-calling loop: let the LLM decide what to do
        max_iterations = 8
        for iteration in range(max_iterations):
            logger.info(f"LLM iteration {iteration + 1} in room {room_id}")

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tool_schemas,
                tool_choice="auto",
                temperature=0.2,
            )

            choice = response.choices[0]
            messages.append(choice.message.model_dump(exclude_none=True))

            if not choice.message.tool_calls:
                # LLM produced a final text response — send it back to the room
                final_text = choice.message.content or ""
                if final_text.strip():
                    await tools.send_message(content=final_text)
                return

            # Execute each tool call the LLM requested
            for tool_call in choice.message.tool_calls:
                name = tool_call.function.name
                try:
                    args = json.loads(tool_call.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}

                logger.info(f"Tool call: {name}({args})")

                try:
                    result = await tools.execute_tool_call(name, args)
                    result_text = json.dumps(result) if not isinstance(result, str) else result
                except Exception as exc:
                    result_text = f"Error: {exc}"
                    logger.exception(f"Tool {name} failed")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": name,
                    "content": result_text,
                })

        logger.warning(f"Exceeded max_iterations in room {room_id}")
