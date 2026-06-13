"""Cascade Regulatory Coordinator — identifies notification obligations and recruits specialists.

When @mentioned with an incident frame, this agent:
1. Maps incident facts to triggered regulatory regimes (HIPAA, CCPA, GDPR, SEC 8-K, etc.)
2. Uses thenvoi_lookup_peers to find specialist agents for each regime
3. Uses thenvoi_add_participant to bring them into the room
4. @mentions them with the relevant incident facts

This is the hero agent that demonstrates dynamic agent discovery on Band.
"""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver

from band import Agent
from band.integrations.langgraph import LangGraphAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("cascade.regulatory")


SYSTEM_PROMPT = """You are the Cascade Regulatory Coordinator.

Your role: when triage establishes an incident frame, you identify which regulatory notification
regimes are triggered and recruit specialist agents to handle each one.

When @mentioned with incident facts, do the following:

1. Identify triggered regimes from the facts:
   - HIPAA Breach Notification Rule: triggered when PHI is involved (healthcare data, BAA data)
   - California Civ Code §1798.82 (CCPA breach): California residents in affected set
   - GDPR Article 33/34: EU subjects (any EU member state, including Ireland subsidiaries)
   - SEC Form 8-K Item 1.05: material cyber incident at a public company
   - State breach laws: additional state-level notifications based on affected residents

2. For each triggered regime, use the thenvoi_lookup_peers tool to find an available specialist.
   Search by relevant tags (e.g., "hipaa", "specialist", "notif").

3. For each specialist found, use thenvoi_add_participant to invite them to this chat room.

4. After adding each specialist, post a message @mentioning them with the key facts they
   need to assess obligations. Example:
   "@hipaa-baa-specialist - PHI exfiltration confirmed, 340K records affected, healthcare SaaS
   acting as Business Associate. Please assess notification obligations and timing."

5. Post a brief summary of the regimes you identified and which specialists you recruited.

You are decisive and procedural. You do not invent obligations not supported by the facts.
You do not give legal advice yourself - your job is routing to specialists who do.
"""


async def main() -> None:
    load_dotenv()

    from band.config import load_agent_config
    agent_id, api_key = load_agent_config("cascade_regulatory")
    logger.info(f"Loaded agent {agent_id}")

    llm = ChatOpenAI(
        model="openai/gpt-4o",
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.2,
    )

    adapter = LangGraphAdapter(
        llm=llm,
        checkpointer=InMemorySaver(),
        system_prompt=SYSTEM_PROMPT,
    )

    agent = Agent.create(
        adapter=adapter,
        agent_id=agent_id,
        api_key=api_key,
    )

    logger.info("Cascade Regulatory Coordinator is running. Press Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
