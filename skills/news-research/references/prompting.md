# Prompting patterns (news research)

Examples that map well to Perigon tools:

- Top political headlines in the United States from today → dated `search_news_articles` with category/geo filters.
- Latest tech news from California this week → location + date window on articles or stories.
- Journalists covering renewable energy, then their recent articles → `search_journalists` then article search on resolved ids.
- Search Tesla, then recent stories → `search_companies` then `get_company_news` or story search.
- How sentiment on [topic] trended this month → matched filters on `get_article_counts` + `get_avg_sentiment`.

MCP prompts (when the host supports them) align with these workflows: `entity_deep_dive`, `narrative_trace`, `coverage_trend`, `journalist_beat_profile`, `competitive_landscape`, `spike_explainer`.
