Meridian Health Analytics — Cascade Case File
Company
Meridian Health Analytics, Inc. (NASDAQ: MRDH)
Clinical-trial data coordination SaaS. Serves CROs and pharma sponsors running multi-site oncology trials. 412 employees. HQ: San Francisco. EU subsidiary: Meridian Health Analytics Ireland Ltd., Dublin (handles EU patient data per GDPR). IPO'd March 2025 at $18/share, currently $24. Q1 2026 revenue $31M, up 47% YoY.
Their flagship product, TrialBridge, ingests patient enrollment data, lab results, adverse event reports, and imaging across trial sites and produces sponsor-facing dashboards. Active in 38 Phase 2/3 trials. ~340,000 patient records under management. All US patient data is covered by Business Associate Agreements with sponsor sites (HIPAA-BAA). EU patient data covered by GDPR Article 28 processor agreements.
Critical context for the incident: Meridian is the data coordinator for NCT-04-7821, a Phase 3 oncology trial for a pancreatic cancer immunotherapy. Enrollment window closes 96 hours from T+0. If Meridian cannot deliver enrollment confirmations to sites by then, 47 patients miss their treatment windows.
Insurance
Carrier: Beacon Specialty Insurance (fictional composite).

Policy: CyberEdge Enterprise Risk, Form CE-2024.

Aggregate Limit: $5,000,000.

Retention: $250,000 per incident.
Coverages triggered by this incident:

Insuring Agreement A: Network Security Liability
Insuring Agreement B: Privacy Liability
Insuring Agreement D: Business Interruption (8-hour waiting period, 180-day period of restoration)
Insuring Agreement F: Cyber Extortion (sublimit: $1,000,000)
Insuring Agreement G: Data Recovery Expense

Critical exclusions to monitor:

§IV.7 Social Engineering — excludes loss from voluntary parting with funds induced by impersonation. Initial vector is unclear, so this becomes a watch-item.
§IV.12 Failure to Patch — excludes loss attributable to failure to apply security patches available for more than 30 days prior to incident. Becomes relevant once forensics identifies the entry vector.
§IV.19 Betterment — restoration costs limited to pre-incident state; upgrades not covered.
§IV.23 Acts of War — standard exclusion. Relevant given current attribution noise around Akira affiliates.

Panel vendors (pre-approved by carrier):

IR Firm: Halcyon Forensics
Breach Counsel: Whitcomb & Ferris LLP (the user / "you" — the breach coach)
Negotiator: Arbor Cyber Negotiations
Forensic Accountant: Belmont Advisory Partners

T+0 — The Notification
Slack message from Meridian's CISO to Whitcomb & Ferris's emergency line, 04:17 PT, Tuesday morning:

Hey — we think we have ransomware. Production database servers are encrypted. There's a note on every endpoint. TrialBridge is down. Need help now.

The Ransom Note
Posted as README.txt on every encrypted endpoint. Akira-typical formatting:
Hello Meridian Health Analytics.

Your network has been compromised. Files encrypted with our 
proprietary algorithm. We have exfiltrated 847GB of data from 
your systems prior to encryption, including:

- Patient enrollment records (340,000+ subjects)
- Clinical trial data (NCT-04-7821 among others)
- Internal financials and unreleased earnings data
- Employee PII and benefits information

We demand 1,800 BTC for decryption keys and deletion of 
exfiltrated data.

You have 96 hours before we begin publishing data on our 
leak site. Negotiation reduces both the timeline and the price.

Contact: akira-mediation@[REDACTED].onion
Reference: MRDH-2026-0613

— Akira
Initial IOCs (Halcyon Forensics preliminary, T+02:00)

Initial access: VPN credential compromise via stolen session token. CVE under investigation, possibly CVE-2024-3400-class (Pan-OS GlobalProtect).
Lateral movement: Impacket SMB, then RDP via compromised service account svc_trialbridge_etl.
Persistence: Scheduled tasks on 14 hosts using LOLBin (schtasks.exe).
Exfil staging: Compressed archives in C:\Windows\Temp\ on 3 file servers, ~847GB total.
Exfil channel: Rclone to mega.nz, transfer completed approximately 7 hours before encryption.
Encryption: Akira variant (Rust-based, dual-extension .akira + .powerranges).
Dwell time estimate: 11-14 days.
Patient data confirmed in exfil set: yes (PII + PHI fields visible in staged archive sample).
EU subject data confirmed in exfil set: yes (Dublin-region records present).
Public company material non-public information: yes (unreleased Q2 financials and trial data tied to NCT-04-7821 efficacy).

Forensics Update (T+18:00)

Entry vector confirmed: VPN appliance vulnerability disclosed in vendor advisory dated May 28, 2026 (16 days before incident). Patch was available May 30.
Meridian's patching SLA for VPN appliances is 14 days. Patch was scheduled for June 13 maintenance window — same day as the incident.
Coverage implication: the patch was available 14 days. Meridian's SLA is 14 days. The exclusion §IV.12 triggers at 30 days. Coverage holds, but barely. The adversary agent will flag this as a carrier-dispute risk.

Jurisdictional Exposure
The Regulatory Coordinator agent identifies the following triggered regimes at T+04:00:
RegimeTriggerClockRecipientHIPAA Breach Notification RulePHI exfiltration confirmed60 days to individuals, 60 days to HHS OCRHHS, affected individualsHHS OCR — 500+ individuals340,000 recordsConcurrent with individual noticeHHS public postingCalifornia Civ Code §1798.82 (CCPA)CA residents in exfil set"Most expedient time possible, without unreasonable delay"CA AG + individuals23 other US state breach lawsMulti-state record setRanging 30-90 daysState AGsGDPR Article 33EU subjects in exfil set72 hours to DPC IrelandData Protection Commission IrelandGDPR Article 34High risk to subjects"Without undue delay"Affected EU subjectsSEC Form 8-K Item 1.05Material cyber incident, public company4 business days from materiality determinationSEC EDGARSponsor BAA notificationsPer individual BAA termsVaries, typically immediateEach affected pharma/CRO sponsor
The 72-hour GDPR clock and the 4-business-day SEC clock are the two hardest deadlines. Both run from the same T+0.
Business Interruption
TrialBridge revenue model: $48 per patient-record per month, recognized ratably. 340,000 records × $48 / 30 = ~$544,000/day in revenue at risk during outage.
Period of restoration: estimated 8-14 days for full restoration with carrier coverage starting after 8-hour waiting period.
Mitigation costs accruing in real-time:

Halcyon Forensics IR engagement: $4,200/hr blended, ~$890,000 estimated
Cloud emergency capacity (clean-room rebuild on AWS): ~$340,000 over restoration period
Notification costs (printing, mailing, call center): est. $1.20M for 340K records
Credit monitoring (2 years, US affected individuals): est. $2.40M
Breach coach + counsel fees: est. $750,000
Regulatory response and filings: est. $180,000

Total estimated insured loss: ~$8.5M against $5M aggregate limit. Coverage will exhaust. Adversary agent will flag the prioritization decision: which mitigation activities draw down the limit fastest.
Decision Points Requiring Human Approval
The breach coach partner must approve, in order:

Initial scope determination and IR engagement letter (T+02:00)
Carrier notification (T+03:00)
Patient/subject notification language for HHS and DPC (T+08:00)
SEC 8-K filing decision (materiality determination, T+24:00)
Ransom negotiation approach — engage or refuse (T+36:00)
Public communications statement (T+48:00)
Final coverage position vs. carrier on §IV.12 patching dispute (T+60:00)

Agent-Specific Reference Outputs
These are the canonical outputs each agent produces against this case file. Use these as the source of truth for the demo script and as the "ground truth" the live agents should approximate.
Triage Agent output (T+00:15):

Incident frame established. Insured: Meridian Health Analytics (NASDAQ: MRDH). Policy: Beacon CyberEdge CE-2024. Aggregate limit $5M, retention $250K. Coverages triggered: A, B, D, F, G. Exclusions flagged for monitoring: §IV.7 (Social Engineering), §IV.12 (Failure to Patch), §IV.19 (Betterment). Data types in scope: PHI, PII, financial MNPI, EU personal data. Geographies: US (24 states), EU (Ireland). Public company status: yes. Routing to @cascade/regulatory-coordinator and @cascade/forensics-liaison.

Regulatory Coordinator output (T+00:45):

Triggered regimes identified: HIPAA BNR, CCPA + 23 state laws, GDPR Articles 33/34, SEC Form 8-K Item 1.05, sponsor BAA notifications. Discovering specialists. → Recruiting @cascade/hipaa-specialist into Regulatory Room → Recruiting @cascade/ccpa-specialist → Recruiting @cascade/sec-8k-specialist → Recruiting @cascade/gdpr-specialist. Hardest deadlines: GDPR Article 33 at T+72:00, SEC 8-K Item 1.05 at T+96:00 (4 business days).

Adversary Agent output (T+18:00):

Carrier-side analysis: §IV.12 Failure-to-Patch is your largest coverage risk. The vendor advisory dated May 28 makes the patch available 16 days before incident; your client's documented SLA is 14 days. The exclusion triggers at 30 days, so you survive — but the carrier will argue that publicly-disclosed VPN vulnerabilities in this product class historically receive expedited patching at peer organizations. Recommend documenting the patching schedule and peer-benchmark research now, before the carrier requests it. Secondary risk: §IV.19 Betterment will reduce restoration coverage if Meridian opts for the AWS clean-room rebuild instead of restoring to pre-incident architecture. Quantify the betterment delta before authorizing.

HIPAA Specialist output (T+01:30):

340,000 individuals affected, all PHI categories. Notification obligations: (1) Individual notice within 60 days of discovery, written notice with substitute notice for stale addresses; (2) HHS OCR within 60 days, plus immediate posting on HHS breach portal due to 500+ threshold; (3) Prominent media notice in states with 500+ affected residents (CA, NY, TX, FL minimum). Sample notification language drafted, pending counsel review.

SEC 8-K Specialist output (T+02:00):

Form 8-K Item 1.05 triggers on materiality determination, not on incident occurrence. Counsel should make materiality determination as a discrete documented decision. If material: filing required within 4 business days. Disclosure must describe material aspects of nature, scope, timing, and material impact, without technical details that aid the threat actor. Drafted disclosure language for counsel review. Note: SEC has been actively enforcing this rule since 2024; recommend filing even if materiality is borderline.

BI Quantification Agent output (continuous):

Revenue at risk: $544K/day. Hour 8 → coverage period begins. Current cumulative documented loss at T+18:00: $1.04M revenue + $720K mitigation = $1.76M. Projected total at restoration: $7.2M-$9.4M range depending on restoration duration. Note: aggregate limit $5M will exhaust at approximately T+96:00 to T+120:00. Recommend triggering carrier excess notification by T+48:00.

