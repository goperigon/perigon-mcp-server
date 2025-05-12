import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { Configuration, V1Api } from "@goperigon/perigon-ts";
import { AuthIntrospectionResponse, Scopes } from "./types/scopes";
import { typedFetch } from "./fetch";
import { HttpError } from "./types/error";
import { registerTools } from "./tools";

type Bindings = Env;

const app = new Hono<{
  Bindings: Bindings;
}>();

type Props = {
  apiKey: string;
  scopes: Scopes[];
};

type State = null;

export class MyMCP extends McpAgent<Bindings, State, Props> {
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

    registerTools(this.server, perigon, this.props.scopes);
  }
}

app.mount("/", async (req, env, ctx) => {
  try {
    const authHeader = req.headers.get("authorization")?.toLowerCase();
    if (!authHeader || !authHeader.startsWith("bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKey = authHeader.replace("bearer ", "");
    if (!apiKey) {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKeyDetails = await typedFetch<AuthIntrospectionResponse>(
      "https://api.perigon.io/v1/auth/introspect",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    ctx.props = {
      apiKey,
      scopes: apiKeyDetails.scopes,
    };

    const response = await MyMCP.mount("/v1/sse").fetch(req, env, ctx);
    return response ?? new Response("No Results", { status: 200 });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      return new Response(
        "Error: " + (error instanceof Error ? error.message : String(error)),
        { status: 500 },
      );
    }

    return new Response(error.responseBody, { status: error.statusCode });
  }
});

export default app;
