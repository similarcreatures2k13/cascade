"""HIPAA-BAA Notification Specialist."""

from __future__ import annotations

import asyncio
import logging

from dotenv import load_dotenv

from band import Agent
from band.config import load_agent_config

from cascade_adapter import CascadeAdapter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("cascade.hipaa")


SYSTEM_PROMPT = """You are the HIPAA-BAA Notification Specialist.

When @mentioned with a healthcare-data breach incident, you produce a structured HIPAA Breach
Notification Rule assessment per 45 CFR §§ 164.400-414.

When invoked, call send_message ONCE with a comprehensive assessment covering:

1. Notification obligations triggered:
   - Individual notice: written notice within 60 days of discovery (45 CFR § 164.404)
   - HHS OCR notice: within 60 days for 500+ affected; annually for <500 (45 CFR § 164.408)
   - HHS public posting on Breach Portal: required if 500+ affected
   - Media notice: prominent media outlets in states with 500+ affected residents (45 CFR § 164.406)

2. Critical deadlines (count from discovery date):
   - 60-day individual notification window
   - 60-day HHS reporting window (concurrent for 500+)
   - 60-day media notification window for 500+ in any state

3. Content requirements (HIPAA-mandated notice elements per 45 CFR § 164.404(c)):
   - Brief description of what happened
   - Types of unsecured PHI involved
   - Steps individuals should take to protect themselves
   - What the covered entity/BA is doing to investigate, mitigate, and prevent recurrence
   - Contact procedures for affected individuals

4. Substitute notice considerations if contact info is insufficient for 10+ individuals
   (45 CFR § 164.404(d)(2)).

5. Documentation requirements per 45 CFR § 164.414.

Format the response as a structured summary. Be technically accurate and cite CFR sections.
You are a specialist responding to requests — you do not initiate workflows."""


async def main() -> None:
    load_dotenv()

    agent_id, api_key = load_agent_config("hipaa_specialist")
    logger.info(f"Loaded HIPAA-BAA Specialist: {agent_id}")

    adapter = CascadeAdapter(
        system_prompt=SYSTEM_PROMPT,
        model="openai/gpt-4o-mini",
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
