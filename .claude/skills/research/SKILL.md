---
name: research
description: Topic-agnostic parallel research wave. Launches specialized agents (Business/Market, API/Docs, Architecture, Domain/Rules, Implementations, YouTube) based on topic type. Produces RESEARCH.md consumed by /build (planning phase).
disable-model-invocation: true
argument-hint: <topic or feature to research>
---

# /research — Parallel Research Wave

Deep, multi-source research before any planning or code is written.
Real agents. Real searches. Real output.

> The research takes time but it is what ensures real quality in the final output.

---

## How it works

```
/research <topic>
    │
    ├─ Phase 0: Understand the topic (Claude, no agents)
    │
    ├─ Phase 1: Parallel research wave (up to 4 simultaneous agents)
    │           ├─ Business/Market Agent       (if product feature with users or identifiable market)
    │           ├─ API/Docs Agent              (if there is integration with external service or API)
    │           ├─ Architecture/Backend Agent   (if there is server logic, DB, cache, or queue)
    │           ├─ Domain/Rules Agent           (if specialized domain or complex business rules)
    │           ├─ Implementations Agent        (always)
    │           └─ YouTube Agent               (if topic likely has relevant technical tutorials)
    │
    ├─ Phase 2: Aggregation → RESEARCH.md generated in the project
    │
    ├─ 5-10 line summary of key findings
    │
    └─ 3-5 clarification questions → waits for response before indicating ready for /build (planning phase)
```

---

## Phase 0 — Understand the topic

> **Emit:** `▶ [1/3] Understanding the topic`

Before launching any agent, analyze the received topic and determine:

1. **Category:** Is it a product feature? An integration with an external API? A service or backend? A regulated or specialized domain? An architectural concept?
2. **Main objective:** What does the user want to build or understand? What is the expected outcome?
3. **Relevant research dimensions:** Based on the topic, decide which agents to launch using the 6 dimensions below. **Maximum 4 agents per wave.** If 5 or more dimensions are relevant, prioritize the 4 most impactful for the topic.

**Selection criteria:**

```
Launch Business/Market when:
  - Product feature with end users
  - There are clear competitors in the market
  - Feature impacts conversion, retention, or monetization

Launch API/Docs when:
  - Feature integrates with an external service (Stripe, SendGrid, Twilio, etc.)
  - There is a third-party API mentioned or implied
  - Feature consumes or exposes a REST/GraphQL/gRPC API

Launch Architecture/Backend when:
  - Feature has server logic, database, cache, or queue
  - Scalability decisions are relevant
  - Feature is a service, worker, or job

Launch Domain/Rules when:
  - Feature operates in a specialized domain (fintech, healthtech, e-commerce, etc.)
  - There are non-obvious business rules involved
  - The domain vocabulary needs to be understood before implementing

Launch Implementations: always

Launch YouTube: when there is a likelihood of relevant technical tutorials
```

Emit a context line before starting the wave:

```
Topic:     [identified topic]
Category:  [Product Feature | API Integration | Backend Service | Domain/Rules | Architecture | Other]
Agents:    [list of agents to be launched and why — maximum 4]
```

---

## Phase 1 — Parallel research wave

> **Emit:** `▶ [2/3] Parallel research in progress`

Launch the selected agents **in parallel** using the Agent tool with:
- `subagent_type: "general-purpose"`
- `run_in_background: false`
- All agents receive the same input context (topic + category)

Wait for all to complete before proceeding to Phase 2.

---

### Business/Market Agent

**Launch when:** Any product feature with end users, when there are clear competitors in the market, or when the feature impacts conversion, retention, or monetization.

**Prompt for the agent:**

```
You are a researcher specialized in market and product analysis.

Research topic: [TOPIC]
Category: [CATEGORY]

Your task is to understand how the market solves this problem: competitors, user demands,
business models, and relevant trends.
Use WebSearch and WebFetch to find updated content — do not invent results.

Sources to research (try at least 3-4 searches before giving up on a source):
- Product Hunt: WebSearch "site:producthunt.com [topic]" → WebFetch on the most relevant pages
- G2: WebSearch "site:g2.com [topic] reviews" → WebFetch on category pages
- App Store / Google Play: WebSearch "[topic] app reviews site:apps.apple.com OR site:play.google.com"
- Hacker News: WebSearch "site:news.ycombinator.com [topic]" → WebFetch on relevant threads
- Reddit: WebSearch "site:reddit.com [topic] [sector]" → WebFetch on the most upvoted posts
- LinkedIn / industry blogs: WebSearch "[topic] [sector] trends 2024 2025"
- Fallback: WebSearch "[topic] competitors comparison market 2024 2025"

For each reference found, extract:
1. Source URL
2. How the product or company approaches the problem
3. What users praise and complain about (if reviews)
4. Business model or pricing identified (if applicable)
5. Gaps or opportunities identified relative to the topic

Return at most 2000 tokens with:
- 3 to 5 concrete references with real URLs
- Summary of how the market approaches the problem today
- Most requested / most complained about features by users
- Gaps identified in competitors
- Market trends for this type of feature

If a source does not return relevant results after 3 attempts, move to the next one.
```

---

### API/Docs Agent

**Launch when:** The feature involves integration with an external service, a third-party API mentioned or implied, or a feature that consumes or exposes a REST/GraphQL/gRPC API.

**Prompt for the agent:**

```
You are a researcher specialized in API documentation and technical integrations.

Research topic: [TOPIC]
Category: [CATEGORY]

Your task is to map the endpoints, authentication, SDKs, and limitations of the API or external service
relevant to this topic.
Use WebSearch and WebFetch to find updated content — do not invent results.

Sources to research (try at least 3-4 searches before giving up on a source):
- Official API documentation: WebFetch on the official docs URL + WebSearch "[api] documentation [version]"
- Official changelog: WebSearch "[api] changelog release notes" → WebFetch to identify current version
- Status page: WebSearch "[api] status page uptime" → WebFetch for incident history
- API GitHub: WebSearch "site:github.com [api provider] sdk" → WebFetch on README and open issues
- RapidAPI: WebSearch "site:rapidapi.com [topic]" → WebFetch on relevant pages
- Public Postman Collections: WebSearch "[api] postman collection" → WebFetch if available
- Fallback: WebSearch "[api] rate limits authentication endpoints 2024 2025"

For each API or service found, extract:
1. Official documentation URL
2. Relevant endpoints with request/response structure (if available)
3. Authentication method (API key, OAuth, JWT, etc.)
4. Rate limits and free vs. paid plan limits
5. Current API version (is it deprecated? is there a v2 or new version?)
6. Official SDKs available and supported languages
7. Common documented errors or open issues on GitHub

Return at most 2000 tokens with:
- Most relevant endpoints with summarized structure
- Required authentication and how to configure it
- Official SDKs available (with links)
- Rate limits and known limitations
- Current version and deprecation status
- Common reported issues or errors

If a source does not return relevant results after 3 attempts, move to the next one.
```

---

### Architecture/Backend Agent

**Launch when:** Backend features, services, APIs, databases, queues, caches; when scalability decisions are relevant; or when the feature is a service, worker, or job.

**Prompt for the agent:**

```
You are a researcher specialized in software architecture and backend systems.

Research topic: [TOPIC]
Category: [CATEGORY]

Your task is to find design patterns, documented trade-offs, and production architecture references
for this type of problem.
Use WebSearch and WebFetch to find updated content — do not invent results.

Sources to research (try at least 3-4 searches before giving up on a source):
- Martin Fowler's blog: WebSearch "site:martinfowler.com [topic]" → WebFetch on found articles
- AWS Architecture Blog: WebSearch "site:aws.amazon.com/blogs/architecture [topic]"
- Google Cloud Blog: WebSearch "site:cloud.google.com/blog [topic]"
- High Scalability: WebSearch "site:highscalability.com [topic]" → WebFetch on relevant posts
- InfoQ: WebSearch "site:infoq.com [topic] architecture" → WebFetch on relevant articles
- GitHub (reference projects): WebSearch "site:github.com [topic] architecture example production"
- Fallback: WebSearch "[topic] design patterns scalability trade-offs production 2024 2025"

For each reference found, extract:
1. Source URL
2. Design pattern or architectural approach described (CQRS, Event Sourcing, Saga, etc.)
3. Documented trade-offs between approaches
4. Database schema or data model for similar entities (if available)
5. Cache and performance strategies for the use case
6. Reported scale (if it mentions volume, RPS, latency, etc.)

Return at most 2000 tokens with:
- Recommended patterns for this type of problem with justification
- Trade-offs per approach (simplicity vs. scalability, consistency vs. availability, etc.)
- Relevant schemas or data models found
- Production implementation references with metrics when available
- 1-2 direct recommendations based on the references

If a source does not return relevant results after 3 attempts, move to the next one.
```

---

### Domain/Rules Agent

**Launch when:** Features with complex business rules, regulated domains (financial, health, legal), or when the domain has specific terminology that needs to be understood before implementing.

**Prompt for the agent:**

```
You are a researcher specialized in business rules and specialized domains.

Research topic: [TOPIC]
Category: [CATEGORY]

Your task is to map the domain terminology, consolidated business rules, applicable regulations,
and known edge cases for this type of feature.
Use WebSearch and WebFetch to find updated content — do not invent results.

Sources to research (try at least 3-4 searches before giving up on a source):
- Official industry documentation: WebSearch "[sector/domain] official documentation standards"
- Relevant RFCs: WebSearch "RFC [topic]" → WebFetch on found documents
- Wikipedia (domain concepts): WebFetch "https://en.wikipedia.org/wiki/[concept]" for definitions
- Applicable legislation: WebSearch "[topic] regulation compliance law [country/region]" if relevant
- ERP/consolidated systems documentation: WebSearch "SAP [topic] OR Salesforce [topic] model"
- Fallback: WebSearch "[domain] business rules terminology glossary best practices"

For each reference found, extract:
1. Source URL
2. Domain definitions and terminology relevant to the topic
3. Consolidated business rules in the industry
4. Applicable regulations or compliance requirements
5. Known edge cases or documented exceptional situations
6. How consolidated systems model similar entities

Return at most 2000 tokens with:
- Compact glossary of the most relevant terms (maximum 10 terms with 1-2 line definitions each)
- Identified business rules that impact implementation
- Domain edge cases that need to be handled
- Applicable normative or regulatory references (if any)
- How market reference systems (SAP, Salesforce, etc.) approach similar entities

If a source does not return relevant results after 3 attempts, move to the next one.
```

---

### Reference Implementations Agent

**Launch when:** Always. This agent is launched for all topics.

**Prompt for the agent:**

```
You are a researcher specialized in open source code implementations and technical articles.

Research topic: [TOPIC]
Category: [CATEGORY]

Your task is to find real implementations and relevant technical articles for this topic.
Use WebSearch and WebFetch to find updated content — do not invent results.

Sources to research (try at least 3-4 searches before giving up on a source):
- GitHub: WebSearch "site:github.com [topic] implementation" and "site:github.com [topic] example"
- Stack Overflow: WebSearch "site:stackoverflow.com [topic]" → WebFetch on the most upvoted answers
- Dev.to: WebSearch "site:dev.to [topic]" → WebFetch on the most relevant articles
- CSS-Tricks (for frontend): WebSearch "site:css-tricks.com [topic]" → WebFetch on found articles
- AWS Docs / PostgreSQL Docs / Redis Docs (for backend): WebSearch "site:docs.aws.amazon.com [topic]" OR "site:postgresql.org/docs [topic]" OR "site:redis.io/docs [topic]"
- Medium/Hashnode: WebSearch "[topic] implementation medium.com OR hashnode.dev"
- Fallback: WebSearch "[topic] open source example implementation 2024 2025"

For each implementation or article found, extract:
1. Source URL
2. Technical approach used (design pattern, algorithms, data structures)
3. Notable technical points (performance, security, reusability, testability)
4. Relevant code snippets (if available)
5. Relevance and quality of the implementation

Return at most 2000 tokens with:
- 3 to 5 implementations or articles with real URLs
- Summary of the most common or most effective technical approaches
- Recurring code patterns found
- Technical recommendations based on the references found

If a source does not return relevant results after 3 attempts, move to the next one.
```

---

### YouTube Agent

**Launch when:** The topic likely has technical video tutorials available (well-known features, popular libraries, documented patterns, common integrations). Omit only if the topic is very specific, proprietary, or unlikely to have video coverage.

**Prompt for the agent:**

```
You are a researcher specialized in educational video content.

Research topic: [TOPIC]
Category: [CATEGORY]

Your task is to find relevant tutorial videos and extract the technical concepts presented.
Use WebSearch and WebFetch to find updated content — do not invent results.

Process (execute in this order):

STEP 1 — Find relevant videos:
  WebSearch: site:youtube.com "[topic]" tutorial 2024 OR 2025
  WebSearch: site:youtube.com "[topic]" implementation walkthrough
  WebSearch: site:youtube.com "[topic]" from scratch

  Select the 2-3 most relevant videos (most recent, most views, most technical).

STEP 2 — For each selected video, try to extract the transcript:
  Try via Bash:
    yt-dlp --write-subs --write-auto-subs --sub-lang en --skip-download \
      --output '/tmp/yt_%(id)s' "VIDEO_URL" 2>/dev/null \
      && cat /tmp/yt_*.vtt 2>/dev/null | head -300

  If yt-dlp is not available or fails: use WebFetch on the video URL to capture
  title, full description, chapters (if available), and pinned comments.

STEP 3 — Analyze the captured content:
  Extract the most important concepts and techniques mentioned.
  Identify specific implementation approaches presented.
  Note libraries, tools, or patterns cited.

Return at most 2000 tokens with:
- URLs of found videos + title + channel + approximate date
- Summary of the main technical concepts from each video
- Libraries, tools, and patterns mentioned
- Implementation approaches identified
- One line indicating which video has the best technical explanation and why

If no relevant videos are found after 3 search attempts, return what was found
with a note indicating the limitation of results.
```

---

## Phase 2 — Aggregation and clarification

> **Emit:** `▶ [3/3] Aggregating results and preparing clarifications`

### 2.1 — Generate RESEARCH.md

Aggregate the results from all agents into `RESEARCH.md` at the project root.
If a `RESEARCH.md` already exists, overwrite it — this is always the result of the most recent research.

File format:

```markdown
# RESEARCH.md — [Topic]
_Generated on: [current date and time]_

## Business & Market Analysis
[results from Business/Market Agent, or "— N/A —" if not launched]

## API & Integration Docs
[results from API/Docs Agent, or "— N/A —" if not launched]

## Architecture & Backend Patterns
[results from Architecture/Backend Agent, or "— N/A —" if not launched]

## Domain Rules & Terminology
[results from Domain/Rules Agent, or "— N/A —" if not launched]

## Implementation References
[results from Implementations Agent]

## Video Insights
[results from YouTube Agent, or "— N/A —" if not launched]

## Key Insights
[3 to 5 bullet points with the most important findings across all sources]
[Prioritize: recurring patterns, consensus among sources, notable technical or product decisions]
```

### 2.2 — Present summary

Present to the user a direct summary of **5 to 10 lines** covering:
- What was found most relevant
- Technical, architectural, or product patterns that stood out
- Domain rules or API limitations identified
- Any surprising or counter-intuitive finding

Format:

```
RESEARCH COMPLETE: [Topic]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[summary in 5-10 lines]

Generated file: RESEARCH.md
```

### 2.3 — Clarification questions

Based on what was researched, ask **3 to 5 clarification questions** that:
- Address gaps identified in the research (something the sources did not cover clearly)
- Force technical or product decisions the user needs to make (e.g.: which API to use? which cache strategy?)
- Expose trade-offs found that depend on the user's priorities (e.g.: consistency vs. performance? simplicity vs. scalability?)
- Help refine the scope before `/build` (planning phase) (e.g.: is the feature an MVP or does it need to be production-ready from the start?)

Present the questions numbered and wait for the user's response.

**After receiving the responses**, emit:

```
Ready for /build [topic].
Use the findings from RESEARCH.md as context for planning (Phase 2 of /build).
```

---

## Behavior notes

- **Agents launch real searches.** Each agent uses WebSearch and WebFetch to find updated content. Do not substitute with the model's internal knowledge — the goal is to bring external and recent information.
- **Each agent tries 3-4 searches per source** before giving up and moving to the next one. Persistence is part of the process.
- **Results not found are reported honestly.** If a source returned nothing useful, the agent records this instead of inventing content.
- **Maximum 4 agents per wave.** If 5 or more dimensions are relevant, the orchestrator prioritizes the 4 most impactful for the topic before launching the wave.
- **RESEARCH.md is the main artifact.** It should be useful as a reference during `/build` (planning phase) and `/feature-dev` — not a raw dump, but an edited and synthesized document.
- **The clarification questions end the flow.** Do not proceed to `/build` automatically — wait for the user to respond before indicating readiness.

---

## Context Budget

This skill launches multiple research agents in parallel — each wave consumes ~8-12k tokens.

**Checkpoint triggers:**
- After Phase 1 (complete wave): write `.claude/checkpoint.md` with launched agents, partial results, and next step
- If estimated context reaches ~60k tokens during aggregation: write checkpoint with partial findings and emit:
  `↺ Context ~60k — checkpoint written. Recommend /compact. Use /resume to continue RESEARCH.md aggregation.`

**Checkpoint format:**
```
skill: /research
phase: [phase_0 | wave_in_progress | aggregation | qa_gate]
topic: [researched topic]
completed_agents: [list]
pending_agents: [list]
partial_findings: [summary of findings already collected]
next: [exact next step]
```
