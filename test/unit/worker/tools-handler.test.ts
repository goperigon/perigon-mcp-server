import { afterEach, describe, expect, mock, test } from "bun:test";
import { HttpError } from "../../../worker/types/types";
import { SOCIAL_TOOL_NAMES } from "../../../worker/mcp/tools/social";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

let introspectionResult: Record<string, unknown> | HttpError = {
  scopes: [],
  organizationId: 1,
};

const realPerigonModule = await import("../../../worker/lib/perigon");
await mock.module("../../../worker/lib/perigon", () => ({
  ...realPerigonModule,
  Perigon: class {
    introspection() {
      return introspectionResult instanceof HttpError
        ? Promise.reject(introspectionResult)
        : Promise.resolve(introspectionResult);
    }
  },
}));
const { handleTools } = await import("../../../worker/handlers/tools");

interface ListedTool {
  name: string;
  socialSource?: string;
}

interface ToolsListBody {
  tools: ListedTool[];
  socialSources: string[] | null;
}

const env = {} as Env;

function listRequest(apiKey?: string): Request {
  const headers = new Headers();
  if (apiKey) headers.set("X-Perigon-API-Key", apiKey);
  return new Request("https://mcp.perigon.io/v1/api/tools", { headers });
}

afterEach(() => {
  restoreFetch();
  introspectionResult = { scopes: [], organizationId: 1 };
});

describe("handleTools GET", () => {
  test("lists every social tool with its social source", async () => {
    const response = await handleTools(listRequest(), env);
    const body = (await response.json()) as ToolsListBody;

    const social = body.tools.filter((tool) => tool.socialSource);
    expect(social.map((tool) => tool.name)).toEqual(SOCIAL_TOOL_NAMES);
    expect(
      body.tools.find((tool) => tool.name === "search_reddit_posts")
        ?.socialSource,
    ).toBe("REDDIT");
    expect(
      body.tools.find((tool) => tool.name === "search_news_articles")
        ?.socialSource,
    ).toBeUndefined();
  });

  test("reports null social sources without an API key", async () => {
    const response = await handleTools(listRequest(), env);
    const body = (await response.json()) as ToolsListBody;
    expect(body.socialSources).toBeNull();
  });

  test("reports the key's social sources from introspection", async () => {
    introspectionResult = {
      scopes: [],
      organizationId: 1,
      socialSources: ["REDDIT"],
    };

    const response = await handleTools(listRequest("tools-key-reddit"), env);
    const body = (await response.json()) as ToolsListBody;
    expect(body.socialSources).toEqual(["REDDIT"]);
  });

  test("keeps the list and reports null when introspection fails", async () => {
    introspectionResult = new HttpError(401, "invalid api key");
    const errorSpy = mock(() => {});
    const original = console.error;
    console.error = errorSpy as typeof console.error;
    try {
      const response = await handleTools(listRequest("tools-key-bad"), env);
      const body = (await response.json()) as ToolsListBody;
      expect(response.status).toBe(200);
      expect(body.tools.length).toBeGreaterThan(0);
      expect(body.socialSources).toBeNull();
    } finally {
      console.error = original;
    }
  });
});

describe("handleTools POST", () => {
  function runRequest(tool: string, args: unknown): Request {
    return new Request("https://mcp.perigon.io/v1/api/tools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Perigon-API-Key": "tools-key-run",
      },
      body: JSON.stringify({ tool, args }),
    });
  }

  test("resolves social tools for execution", async () => {
    installFetchMock((input) =>
      urlOf(input).endsWith("/v1/user")
        ? new Response("unauthorized", { status: 401 })
        : jsonResponse({}),
    );
    const errorSpy = mock(() => {});
    const original = console.error;
    console.error = errorSpy as typeof console.error;
    try {
      // Invalid args stop before the upstream call, proving the lookup found it.
      const response = await handleTools(
        runRequest("search_x_posts", {}),
        env,
      );
      expect(response.status).toBe(400);
    } finally {
      console.error = original;
    }
  });

  test("still returns 404 for unknown tools", async () => {
    const response = await handleTools(runRequest("not_a_tool", {}), env);
    expect(response.status).toBe(404);
  });
});
