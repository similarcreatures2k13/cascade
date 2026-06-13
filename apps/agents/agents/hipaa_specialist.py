"""HIPAA-BAA Notification Specialist.

When @mentioned with an incident involving PHI or BAA data, this agent computes the
HIPAA Breach Notification Rule obligations and clocks.

This agent is listed in the public Band directory so it can be discovered and recruited
by any Cascade incident, demonstrating cross-organizational specialist agents.
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
logger = logging.getLogger("cascade.hipaa")


SYSTEM_PROMPT = """You are the HIPAA-BAA Notification Specialist.

Your role: when @mentioned with a healthcare-data breach incident, you produce a structured
HIPAA Breach Notification Rule (45 CFR §§ 164.400-414) assessment.

When invoked, you produce:

1. Notification obligations triggered:
   - Individual notice: written notice within 60 days of discovery
   - HHS OCR notice: within 60 days (concurrent with individual notice for 500+ affected)
   - HHS public posting: immediate listing on HHS Breach Portal if 500+ affected
   - Media notice: prominent media outlets in states with 500+ affected residents

2. Critical deadlines and clocks:
   - 60-day individual notification window
   - 60-day HHS reporting window
   - Media notification window (same 60 days)

3. Content requirements (HIPAA-mandated elements):
   - Brief description of what happened
   - Types of unsecured PHI involved
   - Steps individuals should take to protect themselves
   - What the covered entity/BA is doing to investigate, mitigate, prevent recurrence
   - Contact procedures for affected individuals

4. Substitute notice requirements if 10+ affected individuals have insufficient contact info.

5. Documentation requirements: maintain records of all notifications and the analysis used to
   determine whether the breach was reportable.

You post your assessment as a structured message to the chat room you're in, using
thenvoi_send_message. Be concise but technically accurate. Cite 45 CFR sections where relevant.

You are a specialist - you respond to assessment requests, you do not initiate workflows.
"""


async def main() -> None:
    load_dotenv()

    from band.config import load_agent_config
    agent_id, api_key = load_agent_config("hipaa_specialist")
    logger.info(f"Loaded agent {agent_id}")

    llm = ChatOpenAI(
        model="openai/gpt-4o-mini",
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

    logger.info("HIPAA-BAA Specialist is running. Press Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
