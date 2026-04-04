# Phase 1 — Research

> **Emit:** `▶ [1/3] Research — launching parallel agents`

Executes the `/research` skill protocol for the topic confirmed in Phase 0.

## Research Wave (Parallel Agents)

Launch up to 4 simultaneous agents based on feature type. The orchestrator selects agents based on the idea confirmed in Phase 0.

**Business/Market Agent** — market and competitor research (use whenever the feature has end users)
- Search: competitors and how they solve the same problem (Product Hunt, G2, Capterra)
- Search: user reviews — what they praise, what they complain about
- Search: industry blogs and reference posts about the problem

**API/Docs Agent** — third-party integration research (use if the feature integrates with external APIs)
- Search: official documentation for each mentioned external service
- Search: relevant endpoints, rate limits, authentication and available SDKs
- Search: changelogs and supported versions

**Architecture/Backend Agent** — design patterns and infrastructure research (use if there's backend or infra)
- Search: applicable design patterns (Martin Fowler, AWS/GCP blogs, relevant RFCs)
- Search: schema decisions, data modeling and persistence strategies
- Search: architecture trade-offs documented by practitioners

**Domain/Rules Agent** — specialized domain research (use if the domain has specific terminology or rules)
- Search: industry rules, regulations and relevant compliance
- Search: canonical domain terminology (for entity naming)
- Search: RFCs, standards or applicable formal specifications

**YouTube/Tutorials Agent** — video implementation research
- Search: tutorials and walkthroughs for the pattern/feature
- Search: common pitfalls and lessons learned
- Search: alternative approaches demonstrated

**Implementations Agent** — real implementation research (always included)
- Search: reference open source repositories
- Search: recommended code snippets and patterns
- Search: documented implementation trade-offs

**Product Discovery Agent** — feature audit of reference products (use ALWAYS when the idea mentions existing products: "like X", "similar to Y", "clone of Z", or when analogies were identified in Phase 0)
- Search: complete feature list of each reference product (official docs, feature pages, pricing pages, help center)
- Search: screenshots, demos and YouTube reviews, product walkthroughs
- Search: comparisons between reference products (G2, Capterra, Reddit, versus pages)
- Search: what users love/hate about each product (reviews, forums, Twitter/X)
- Output: feature table per product with categorization (Core / Secondary / Advanced)
- Output: autonomous feature set recommendation based on the user's objective
- **In autonomous mode:** this agent is MANDATORY when there are reference products. It defines the feature set, not the user.
- **In guided mode:** this agent informs, but the user defines the final feature set.

Each agent uses WebSearch and WebFetch for real research — never fabricate data.

## Aggregation

Consolidate all findings into `RESEARCH.md` with this structure:

```markdown
# Research: [Feature Name]

## Key Insights
[5-10 bullets with the most relevant findings]

## Business & Market Analysis
[findings from the Business/Market agent]

## API & Integration Docs
[findings from the API/Docs agent: endpoints, rate limits, SDKs]

## Architecture & Backend Patterns
[findings from the Architecture/Backend agent]

## Domain Rules & Terminology
[findings from the Domain/Rules agent: rules, canonical terminology]

## Implementation Patterns
[findings from real implementations]

## Product Discovery (if reference products identified)
[features mapped from each reference product]
[comparison table: Feature | Product A | Product B | Product C]
[categorization: Core / Secondary / Advanced]
[feature set recommendation for this project with justification]
[included vs excluded features with reasoning]

## Pitfalls & Lessons Learned
[known problems and how to avoid them]

## References
[links with descriptions]
```

## Post-Research QA Gate

Before the pause, execute:
```
/qa-loop (scope: RESEARCH.md, dimensions: qa-research)
```
If `qa-research` returns BLOCKER → fix research gaps (spawn an additional research agent) before presenting to the user.

## Mandatory Pause After Research

After generating `RESEARCH.md` and passing the gate, present to the user:

1. **Key Insights** (extracted from RESEARCH.md, 5-10 lines)
2. **3-5 clarification questions** based on findings — focused on gaps, trade-offs or decisions that the research revealed and that require human input

Examples of relevant questions:
- "The research found two approaches: X (simpler) and Y (more scalable). Which do you prefer?"
- "APIs A and B cover the same use case. A has better DX, B has better rate limits. Any preference?"
- "The feature touches authentication — research revealed that the project's pattern uses JWT. Do you confirm we should follow this pattern?"

Wait for user response before starting Phase 2.

> **Checkpoint after Phase 1:**
> Write `.claude/checkpoint.md`:
> ```
> phase: research_complete
> research_md: generated
> user_responses: [responses recorded]
> next: phase_2_planning
> ```

If context reaches ~60k tokens (write checkpoint) / ~80k (compact recommended) before completing Phase 1:
Write checkpoint with partial state and emit:
`↺ Context ~60k. Recommend /compact. Use /resume to continue in Phase 1 (partial research recorded).`
