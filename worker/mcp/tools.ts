import {
  AllEndpointSortBy,
  V1Api,
  ResponseError,
  FetchError,
  RequiredError,
  SortBy,
} from "@goperigon/perigon-ts";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

function createSearchField(contextDescription: string) {
  return z
    .string()
    .optional()
    .transform((value) => {
      if (!value?.trim()) return value;

      // If already has operators, quotes, or special chars, leave as-is
      if (/\b(AND|OR|NOT)\b|[(){}*?"']/.test(value)) {
        return value;
      }

      // Split on whitespace and join with AND for simple phrases
      const words = value.trim().split(/\s+/);
      if (words.length > 1) {
        return words.join(" AND ");
      }

      return value;
    })
    .describe(
      `Elasticsearch-style search query for filtering ${contextDescription}. Supports advanced search syntax including:

    • Boolean operators: AND, OR, NOT (case-sensitive)
    • Exact phrase matching: Use double quotes around phrases (e.g., "US Election")
    • Wildcards: Use * for multiple characters, ? for single character (e.g., econom*, climat?)
    • Grouping: Use parentheses to group terms (e.g., (trump OR biden) AND election)
    • Field-specific searches: Can target specific content areas

    Examples:
    • Simple terms: trump biden
    • Boolean logic: "trump" OR "biden"
    • Phrase matching: "US Election" AND "trump"
    • Wildcards: climat* AND (warming OR change)
    • Complex queries: ("artificial intelligence" OR AI) AND (healthcare OR medical) NOT cryptocurrency

    Note: Simple phrases will be automatically joined with AND operators. Use quotes for exact phrase matching.`,
    );
}

const categories = z
  .array(z.string())
  .optional()
  .describe(
    "Filter by the content categories (e.g., Politics, Tech, Sports, Business, Finance)",
  );

const topics = z
  .array(z.string())
  .optional()
  .describe(
    "Filter by specific topics such as Markets, Crime, Cryptocurrency, or College Sports. Topics are more granular than categories",
  );

function parseTime(str: string) {
  if (str === "") return undefined;
  return new Date(str);
}

function toolResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

const noResults = toolResult("No results found");

async function createErrorMessage(error: any) {
  let msg: string | undefined;
  if (error instanceof ResponseError) {
    msg = await error.response.text();
  } else if (error instanceof FetchError) {
    msg = error.cause.message;
  } else if (error instanceof RequiredError) {
    msg = error.message;
  }
  return msg;
}

type ToolCallback = (args: any) => Promise<CallToolResult>;

const locationArgs = z.object({
  countries: z
    .array(z.string())
    .optional()
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .default(["us"])
    .describe(
      `This field filters the returned results based on the country associated with the event or news.
      Only results tagged with one of these countries will be included.
      The countries should each be listed by their 2 letter country code, ex "us", "ca", "mx".`,
    ),
  states: z
    .array(z.string())
    .optional()
    .transform((states) => {
      if (!states) return undefined;
      return states.map((state) => state.toUpperCase());
    })
    .describe(
      "Filter results where a specified state plays a central role in the content, beyond mere mentions. States should be listed by their 2 character ISO code, Example: TX",
    ),
  cities: z
    .array(z.string())
    .optional()
    .describe(
      "Filter results where a specified city plays a central role in the content, beyond mere mentions. Example: Austin.",
    ),
});

const paginationArgs = z.object({
  page: z
    .number()
    .min(1)
    .default(1)
    // It is easier to tell the llm to start at 1 than 0
    .transform((page) => page - 1)
    .describe(
      "The specific page of results to retrieve in the paginated response. Starts at 1.",
    ),
  size: z
    .number()
    .min(1)
    .max(1000)
    .default(10)
    .describe(
      "The number of results to return per page in the paginated response.",
    ),
});

const defaultArgs = z.object({
  from: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Filter for articles published before this date. Accepts ISO 8601 format (e.g., 2022-02-01T23:59:59) or yyyy-mm-dd format.",
    ),
  to: z
    .string()
    .transform(parseTime)
    .optional()
    .describe(
      "Filter for articles published before this date, avoid setting this field unless you are looking in the distant past and want to set an upper bound for time. Accepts ISO 8601 format (e.g., 2022-02-01T00:00:00) or yyyy-mm-dd format.",
    ),
});

export const articleArgs = z.object({
  ...locationArgs.shape,
  ...paginationArgs.shape,
  ...defaultArgs.shape,
  query: createSearchField("article content"),
  sortBy: z
    .enum([
      AllEndpointSortBy.Date,
      AllEndpointSortBy.ReverseDate,
      // AllEndpointSortBy.Relevance, // todo: relevance needs specific prompting
    ])
    .default(AllEndpointSortBy.Date)
    .optional(),
  articleIds: z
    .array(z.string())
    .optional()
    .describe("Filter for a specific articles by ID."),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for a specific articles by journalist ID."),
  newsStoryIds: z
    .array(z.string())
    .optional()
    .describe(
      `Filter for a specific articles by news story IDs they belong to (id of the "headlines" or news clusters).`,
    ),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      `Filter articles by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`,
    ),
  summarize: z
    .boolean()
    .default(true)
    .describe(
      "Read the article summary instead of full content, defaults to true",
    ),
});

export function searchNewsArticles(perigon: V1Api): ToolCallback {
  return async ({
    query,
    page,
    size,
    states,
    cities,
    countries,
    from,
    to,
    sortBy,
    articleIds,
    journalistIds,
    newsStoryIds,
    sources,
    summarize,
  }: z.infer<typeof articleArgs>): Promise<CallToolResult> => {
    return perigon
      .searchArticles({
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country: countries,
        from,
        to,
        sortBy,
        articleId: articleIds,
        journalistId: journalistIds,
        clusterId: newsStoryIds,
        source: sources,
        showNumResults: true,
        showReprints: false,
      })
      .then((result) => {
        if (result.numResults === 0) return noResults;

        const articles = result.articles.map((article) => {
          const journalistIds =
            article.journalists
              ?.map((journalist) => journalist.id)
              .join(", ") ?? "";

          return `<article id="${article.articleId}" title="${article.title}">
Content: ${summarize ? article.summary : article.content}
Pub Date: ${article.pubDate} (utc)
Source: ${article.source}
Story Id: ${article.clusterId}
Journalist Ids: ${journalistIds}
</article>`;
        });

        let totalPages = Math.ceil(result.numResults / size);
        let output = `Got ${result.numResults} articles (page ${page + 1} of ${totalPages})`;
        output += "\n<articles>\n";
        output += articles.join("\n\n");
        output += "\n</articles>";

        return toolResult(output);
      })
      .catch(async (error) => {
        console.error("Error searching articles:", error);
        return toolResult(
          `Error: Failed to search articles: ${createErrorMessage(error)}`,
        );
      });
  };
}

export const searchStoriesArgs = z.object({
  ...locationArgs.shape,
  ...paginationArgs.shape,
  ...defaultArgs.shape,
  query: createSearchField("story/headline content"),
  categories,
  topics,
  newsStoryIds: z
    .array(z.string())
    .optional()
    .describe(
      `Filter for a specific articles by news story IDs they belong to (id of the "headlines" or news clusters).`,
    ),
  sortBy: z
    .enum([
      SortBy.Count,
      SortBy.CreatedAt,
      SortBy.Relevance,
      SortBy.TotalCount,
      SortBy.UpdatedAt,
    ])
    .default(SortBy.CreatedAt)
    .optional(),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      `Filter news stories by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`,
    ),
});

export function searchNewsStories(perigon: V1Api): ToolCallback {
  return async ({
    query,
    page,
    size,
    states,
    cities,
    countries,
    from,
    to,
    sortBy,
    newsStoryIds,
    sources,
    categories,
    topics,
  }: z.infer<typeof searchStoriesArgs>): Promise<CallToolResult> => {
    return perigon
      .searchStories({
        q: query,
        page,
        size,
        state: states,
        city: cities,
        country: countries,
        from,
        to,
        sortBy,
        clusterId: newsStoryIds,
        source: sources,
        showNumResults: false,
        showDuplicates: true,
        category: categories,
        topic: topics,
      })
      .then((result) => {
        if (result.numResults === 0) return noResults;

        const stories = result.results.map((story) => {
          return `<news_story id="${story.id}" title="${story.name}">
Content: ${story.summary}
Created At: ${story.createdAt} (utc)
Updated At: ${story.updatedAt} (utc)
Sentiment: ${JSON.stringify(story.sentiment)}
</news_story>`;
        });

        let totalPages = Math.ceil(result.numResults / size);
        let output = `Got ${result.numResults} stories (page ${page + 1} of ${totalPages})`;

        output += "\n<stories>\n";
        output += stories.join("\n\n");
        output += "\n</stories>";

        return toolResult(output);
      })
      .catch(async (error) => {
        console.error("Error searching news stories:", error);
        return toolResult(
          `Error: Failed to search news stories: ${createErrorMessage(error)}`,
        );
      });
  };
}

export const journalistArgs = z.object({
  ...paginationArgs.shape,
  query: createSearchField("journalist name and title"),
  categories,
  topics,
  labels: z
    .array(z.string())
    .optional()
    .describe(
      "Filter journalists by the type of content they typically produce (e.g., Opinion, Paid-news, Non-news)",
    ),
  journalistIds: z
    .array(z.string())
    .optional()
    .describe("Filter for specific journalists by journalist ID."),
  sources: z
    .array(z.string())
    .optional()
    .describe(
      `Filter journalists by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`,
    ),
  maxMonthlyPosts: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Filter journalists by maximum monthly posts."),
  minMonthlyPosts: z
    .number()
    .min(0)
    .int()
    .positive()
    .optional()
    .describe("Filter journalists by minimum monthly posts."),
  countries: z
    .array(z.string())
    .optional()
    .default(["us"])
    .transform((countries) => {
      if (!countries) return undefined;
      return countries.map((country) => country.toLowerCase());
    })
    .describe(
      "Filter journalists by countries they commonly cover in their reporting. Uses ISO 3166-1 alpha-2 two-letter country codes in lowercase (e.g., us, gb, jp)",
    ),
});

export function searchJournalists(perigon: V1Api): ToolCallback {
  return async ({
    query,
    page,
    size,
    countries,
    maxMonthlyPosts,
    minMonthlyPosts,
    sources,
    categories,
    topics,
    labels,
  }: z.infer<typeof journalistArgs>): Promise<CallToolResult> => {
    return perigon
      .searchJournalists({
        q: query,
        page,
        size,
        country: countries,
        source: sources,
        showNumResults: true,
        minMonthlyPosts,
        maxMonthlyPosts,
        label: labels,
        category: categories,
        topic: topics,
      })
      .then((result) => {
        if (result.numResults === 0) return noResults;

        const journalists = result.results.map((journalist) => {
          // TODO: add more journalist result options
          return `<journalist id="${journalist.id}" name="${journalist.name}">
Headline: ${journalist.headline}
Sources: ${journalist?.topSources?.join(", ")}
Locations: ${journalist?.locations?.map((location) => `Country: ${location.country}, City: ${location.city}`).join(", ")}
</journalist>`;
        });

        let totalPages = Math.ceil(result.numResults / size);
        let output = `Got ${result.numResults} journalists (page ${page + 1} of ${totalPages})`;
        output += "\n<journalists>\n";
        output += journalists.join("\n\n");
        output += "\n</journalists>";

        return toolResult(output);
      })
      .catch(async (error) => {
        console.error("Error searching journalists:", error);
        return toolResult(
          `Error: Failed to search journalists: ${createErrorMessage(error)}`,
        );
      });
  };
}

export const sourceArgs = z.object({
  ...paginationArgs.shape,
  ...locationArgs.shape,
  domains: z
    .array(z.string())
    .optional()
    .describe(
      `Filter sources by specific publisher domains or subdomains. Supports wildcards (* and ?) for pattern matching (e.g., *cnn.com)`,
    ),
  name: createSearchField("source name or alternative names"),
  sortBy: z
    .enum([
      SortBy.Count,
      SortBy.CreatedAt,
      SortBy.Relevance,
      SortBy.TotalCount,
      SortBy.UpdatedAt,
    ])
    .default(SortBy.CreatedAt)
    .optional(),
  minMonthlyVisits: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with at least this many monthly visits"),
  maxMonthlyVisits: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with no more than this many monthly visits"),
  minMonthlyPosts: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with at least this many monthly posts"),
  maxMonthlyPosts: z
    .number()
    .int()
    .optional()
    .describe("Filter for sources with no more than this many monthly posts"),
});

export function searchSources(perigon: V1Api): ToolCallback {
  return async ({
    page,
    size,
    cities,
    states,
    countries,
    maxMonthlyPosts,
    minMonthlyPosts,
    maxMonthlyVisits,
    minMonthlyVisits,
    name,
    domains,
  }: z.infer<typeof sourceArgs>): Promise<CallToolResult> => {
    return perigon
      .searchSources({
        name: name,
        domain: domains,
        page,
        size,
        sourceCountry: countries,
        sourceState: states,
        sourceCity: cities,
        showNumResults: true,
        minMonthlyPosts,
        maxMonthlyPosts,
        maxMonthlyVisits,
        minMonthlyVisits,
      })
      .then((result) => {
        if (result.numResults === 0) return noResults;

        const sources = result.results.map((source) => {
          // TODO: add more source result options
          return `<source name="${source.name}">
Domain: ${source.domain}
Monthly Visits: ${source.monthlyVisits}
Top Topics: ${source.topTopics?.join(", ")}
</source>`;
        });

        let totalPages = Math.ceil(result.numResults / size);
        let output = `Got ${result.numResults} sources (page ${page + 1} of ${totalPages})`;
        output += "\n<sources>\n";
        output += sources.join("\n\n");
        output += "\n</sources>";

        return toolResult(output);
      })
      .catch(async (error) => {
        console.error("Error searching sources:", error);
        return toolResult(
          `Error: Failed to search sources: ${createErrorMessage(error)}`,
        );
      });
  };
}

export const peopleArgs = z.object({
  ...paginationArgs.shape,
  name: createSearchField("person's name"),
  occupation: createSearchField(
    "occupation names (e.g., politician, actor, CEO, athlete)",
  ),
  wikidataIds: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by Wikidata entity IDs (e.g., Q7747, Q937). These are unique identifiers from Wikidata.org that precisely identify public figures and eliminate name ambiguity. Multiple values create an OR filter.",
    ),
});

export function searchPeople(perigon: V1Api): ToolCallback {
  return async ({
    page,
    size,
    name,
    occupation,
    wikidataIds,
  }: z.infer<typeof peopleArgs>): Promise<CallToolResult> => {
    return perigon
      .searchPeople({
        name: name,
        page,
        size,
        wikidataId: wikidataIds,
        occupationLabel: occupation,
      })
      .then((result) => {
        if (result.numResults === 0) return noResults;

        const people = result.results.map((person) => {
          return `<person name="${person.name}">
Occupation: ${person.occupation}
Position: ${person.position}
Gender: ${person.gender}
Date Of Birth: ${person.dateOfBirth}
Description: ${person.description}
</person>`;
        });

        let totalPages = Math.ceil(result.numResults / size);
        let output = `Got ${result.numResults} people (page ${page + 1} of ${totalPages})`;
        output += "\n<people>\n";
        output += people.join("\n\n");
        output += "\n</people>";

        return toolResult(output);
      })
      .catch(async (error) => {
        console.error("Error searching people:", error);
        return toolResult(
          `Error: Failed to search people: ${createErrorMessage(error)}`,
        );
      });
  };
}

export const companyArgs = z.object({
  ...paginationArgs.shape,
  query: createSearchField(
    "company name, alternative names, domains, and ticker symbol",
  ),
  industry: createSearchField("company industry"),
  sector: createSearchField("company sector classification"),
  domains: z
    .array(z.string())
    .optional()
    .describe(
      "Filter by company domains or websites (e.g., apple.com, microsoft.com)",
    ),
});

export function searchCompanies(perigon: V1Api): ToolCallback {
  return async ({
    page,
    size,
    query,
    domains,
    industry,
    sector,
  }: z.infer<typeof companyArgs>): Promise<CallToolResult> => {
    return perigon
      .searchCompanies({
        q: query,
        page,
        size,
        domain: domains,
        industry,
        sector,
      })
      .then((result) => {
        if (result.numResults === 0) return noResults;

        const companies = result.results.map((company) => {
          return `<company name="${company.name}">
CEO: ${company.ceo}
Description: ${company.description}
Full Time Employees: ${company.fullTimeEmployees}
Industry: ${company.industry}
Country: ${company.country}
</company>`;
        });

        let totalPages = Math.ceil(result.numResults / size);
        let output = `Got ${result.numResults} companies (page ${page + 1} of ${totalPages})`;
        output += "\n<companies>\n";
        output += companies.join("\n\n");
        output += "\n</companies>";

        return toolResult(output);
      })
      .catch(async (error) => {
        console.error("Error searching companies:", error);
        return toolResult(
          `Error: Failed to search companies: ${createErrorMessage(error)}`,
        );
      });
  };
}

export const TOOL_DEFINITIONS = {
  search_news_articles: {
    name: "search_news_articles",
    description:
      "Search individual news articles with advanced filtering by keywords, location, time range, sources, and journalists. Returns full article content or summaries with metadata.",
    parameters: articleArgs,
    createHandler: (perigon: V1Api) => searchNewsArticles(perigon),
  },
  read_news_stories: {
    name: "read_news_stories",
    description:
      "Search clustered news stories and headlines. Returns story summaries, sentiment analysis, and metadata for understanding major news events and trends across multiple sources.",
    parameters: searchStoriesArgs,
    createHandler: (perigon: V1Api) => searchNewsStories(perigon),
  },
  search_journalists: {
    name: "search_journalists",
    description:
      "Find journalists and reporters by name, publication, location, or coverage area. Returns journalist profiles with their top sources, locations, and monthly posting activity.",
    parameters: journalistArgs,
    createHandler: (perigon: V1Api) => searchJournalists(perigon),
  },
  search_sources: {
    name: "search_sources",
    description:
      "Discover news publications and media outlets by name, domain, location, or audience size. Returns source details including monthly visits, top topics, and geographic focus.",
    parameters: sourceArgs,
    createHandler: (perigon: V1Api) => searchSources(perigon),
  },
  search_people: {
    name: "search_people",
    description:
      "Search for public figures, politicians, celebrities, and newsworthy individuals. Returns biographical information including occupation, position, and detailed descriptions.",
    parameters: peopleArgs,
    createHandler: (perigon: V1Api) => searchPeople(perigon),
  },
  search_companies: {
    name: "search_companies",
    description:
      "Find corporations and businesses by name, domain, or industry. Returns company profiles with CEO information, employee count, industry classification, and business descriptions.",
    parameters: companyArgs,
    createHandler: (perigon: V1Api) => searchCompanies(perigon),
  },
} as const;

export type ToolName = keyof typeof TOOL_DEFINITIONS;
