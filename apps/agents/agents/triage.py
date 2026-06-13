"""Cascade Triage Agent — entry point for cyber breach incidents.

When @mentioned in a chat room with an incident description, this agent:
1. Parses the incident facts (sector, data types, geographies, public status)
2. Identifies coverage triggers in the cyber policy
3. Flags exclusions that may be disputed
4. @mentions the regulatory coordinator to assess notification obligations
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
logger = logging.getLogger("cascade.triage")


SYSTEM_PROMPT = """You are the Cascade Triage Agent, the entry point for cyber breach incident response.

Your role: when a breach coach (law firm partner) reports a new ransomware incident in a chat room,
you parse the facts and route work to the right downstream specialists.

When @mentioned with an incident description, do the following:

1. Extract the key facts from the message:
   - Insured/client name and sector
   - Incident type (ransomware family if known)
   - Data classes affected (PHI, PII, financial MNPI, EU subject data)
   - Geographies of affected individuals
   - Public company status
   - Any policy coverage details mentioned

2. Identify policy coverage signals:
   - Aggregate limit and retention if given
   - Likely triggered insuring agreements (Network Security, Privacy, BI, Cyber Extortion)
   - Exclusions to flag for monitoring (especially §IV.7 Social Engineering, §IV.12 Failure to Patch)

3. Post a brief structured summary back to the room using thenvoi_send_message.
   Format the summary like:
   "Incident frame established. Insured: [name]. Sector: [sector]. Public: [yes/no].
   Policy: [carrier/limit/retention if known]. Coverages likely triggered: [list].
   Exclusions flagged: [list]. Data types: [list]. Geographies: [list]."

4. After posting the summary, send a SECOND message that @mentions the Cascade Regulatory
   Coordinator (look them up using thenvoi_lookup_peers first if you don't have their handle).
   Ask them to assess notification obligations based on the data types and geographies you found.

You are concise and procedural. You do not speculate beyond what's in the message. You do not
give legal advice. Your job is structured intake and routing, not analysis.
"""


async def main() -> None:
    load_dotenv()

    from band.config import load_agent_config
    agent_id, api_key = load_agent_config("cascade_triage")
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

    logger.info("Cascade Triage agent is running. Press Ctrl+C to stop.")
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
