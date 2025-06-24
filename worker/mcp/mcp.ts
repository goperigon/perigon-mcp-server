import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { Scopes } from "../types/types";
import {
  searchNewsArticles,
  articleArgs,
  searchStoriesArgs,
  searchNewsStories,
  searchJournalists,
  journalistArgs,
  sourceArgs,
  searchSources,
  peopleArgs,
  searchPeople,
  companyArgs,
  searchCompanies,
} from "./tools";

type Bindings = Env;

type Props = {
  apiKey: string;
  scopes: Scopes[];
};

type State = null;

export class PerigonMCP extends McpAgent<Bindings, State, Props> {
  server = new McpServer({
    name: "Perigon News API",
    version: "1.0.0",
  });

  async init() {
    const perigon = new V1Api(
      new Configuration({
        apiKey: this.props.apiKey,
      }),
    );

    if (this.props.scopes.includes(Scopes.CLUSTERS)) {
      this.server.tool(
        "read_news_stories",
        "Search clustered news stories and headlines. Returns story summaries, sentiment analysis, and metadata for understanding major news events and trends across multiple sources.",
        searchStoriesArgs.shape,
        searchNewsStories(perigon),
      );
    }

    if (this.props.scopes.includes(Scopes.JOURNALISTS)) {
      this.server.tool(
        "search_journalists",
        "Find journalists and reporters by name, publication, location, or coverage area. Returns journalist profiles with their top sources, locations, and monthly posting activity.",
        journalistArgs.shape,
        searchJournalists(perigon),
      );
    }

    if (this.props.scopes.includes(Scopes.SOURCES)) {
      this.server.tool(
        "search_sources",
        "Discover news publications and media outlets by name, domain, location, or audience size. Returns source details including monthly visits, top topics, and geographic focus.",
        sourceArgs.shape,
        searchSources(perigon),
      );
    }

    if (this.props.scopes.includes(Scopes.PEOPLE)) {
      this.server.tool(
        "search_people",
        "Search for public figures, politicians, celebrities, and newsworthy individuals. Returns biographical information including occupation, position, and detailed descriptions.",
        peopleArgs.shape,
        searchPeople(perigon),
      );
    }

    if (this.props.scopes.includes(Scopes.COMPANIES)) {
      this.server.tool(
        "search_companies",
        "Find corporations and businesses by name, domain, or industry. Returns company profiles with CEO information, employee count, industry classification, and business descriptions.",
        companyArgs.shape,
        searchCompanies(perigon),
      );
    }

    this.server.tool(
      "search_news_articles",
      "Search individual news articles with advanced filtering by keywords, location, time range, sources, and journalists. Returns full article content or summaries with metadata.",
      articleArgs.shape,
      searchNewsArticles(perigon),
    );
  }
}
