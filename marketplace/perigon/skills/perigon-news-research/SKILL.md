---
name: perigon-news-research
description: Search and analyze global news with Perigon—articles, stories, entities, journalists, sentiment and volume trends, and sourced briefings. Use when the user asks for recent headlines, coverage of a company or person, narrative tracking, journalist beats, competitive news landscape, or quantitative media trends.
---

Use this skill for open-web news intelligence through the Perigon MCP server. The server enforces authentication, scopes, and quotas; this skill defines how to combine tools into reliable, cited answers.

## Session setup

1. Treat **today’s date** (and the user’s timezone if known) as the anchor for “recent,” “this week,” and “today.” Do not assume the model cutoff is current.
2. Call `get_api_access` **once** at the start of a research session, and again after any **403** or unexpectedly empty or stripped field. Do not infer missing data as “none exists” until entitlements are checked.
3. When the host exposes MCP resources, read `perigon://reference/entitlements` after `get_api_access` if behavior is unclear. For multi-step entity work, read `perigon://reference/chaining`. For field semantics, read `perigon://reference/fields`.

## Core rules

- **Resolve names to IDs before filtering** when possible (`search_companies` → company id, `search_people` → wikidata id, `search_sources` → source id). Names collide; IDs do not.
- **Prefer stats tools** over counting search results manually. Pair `get_article_counts` with `get_avg_sentiment` using **identical filters** when the user asks about trends.
- **Cite sources.** When reporting facts from articles, include publication, title, date, and URL when the tool returns them. Do not invent articles, quotes, or URLs.
- **Do not mutate** monitors, watchlists, or source groups unless the user explicitly asks to create, update, or change status.
- If a tool is unavailable in the session, say so and offer what is available under the current scopes—do not silently skip steps.

## Workflows

### Headlines and discovery

1. Clarify geography, topic, and time window if the request is vague.
2. Use `search_news_articles` for article-level results; use `search_news_stories` when the user wants clustered narratives (requires clusters scope).
3. For semantic “find articles like this” requests, use `search_vector_news` when entitled.

### Entity coverage (company, person, place)

1. Look up the entity (`search_companies`, `search_people`, or location via filters / `get_location_news`).
2. Confirm the correct match with the user when multiple candidates appear.
3. Fetch recent coverage (`get_company_news`, `get_person_news`, `get_location_news`, or filtered `search_news_articles`).
4. Optionally add `summarize_news` for a cited overview when entitled.

### Trend and spike questions

1. Apply the same date range and filters to `get_article_counts` and `get_avg_sentiment`.
2. Use `get_top_companies`, `get_top_people`, or `get_top_entities` for “who is spiking” questions.
3. Use `get_top_topics` (opt-in tool) for taxonomy-level spikes when needed.

### Journalist and source research

1. `search_journalists` or `search_sources` to resolve profiles.
2. Follow with filtered article or story search on the resolved id or domain.
3. Distinguish **based-in** vs **covers** location for journalists when both matter (see chaining reference).

### Story evolution

1. `search_news_stories` to find the cluster.
2. `search_story_history` for how coverage changed over time when entitled.

## Output

- Lead with a direct answer, then supporting detail.
- Separate **facts from tools** vs **interpretation**.
- When results are partial due to limits, say what was searched and suggest a narrower follow-up.
- For large result sets, summarize themes and offer to drill into one thread.

## When to stop or ask

- Ask before creating monitors or changing org resources.
- Ask which entity match is correct when lookup returns ambiguous results.
- Decline to fabricate news, private data, or paywalled full text not returned by the API.
