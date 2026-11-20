import { afterEach, describe, expect, test } from "bun:test";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Perigon } from "../../../../worker/lib/perigon";
import { emptyMcpTelemetryHeaders } from "../../../../worker/lib/telemetry-headers";
import {
  MonitorDto,
  MonitorNewsletterDto
} from "../../../../worker/types/monitors";
import { SocialSource } from "../../../../worker/types/types";
import {
  buildCreateMonitorArgs,
  createMonitor,
  createMonitorArgs,
  createMonitorTool,
  createMonitorToolForSources
} from "../../../../worker/mcp/tools/monitors/create-monitor";
import {
  buildUpdateMonitorArgs,
  updateMonitor,
  updateMonitorArgs,
  updateMonitorToolForSources
} from "../../../../worker/mcp/tools/monitors/update-monitor";
import {
  setMonitorStatus,
  setMonitorStatusArgs
} from "../../../../worker/mcp/tools/monitors/set-monitor-status";
import {
  getMonitorNewsletters,
  getMonitorNewslettersArgs
} from "../../../../worker/mcp/tools/monitors/get-monitor-newsletters";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf
} from "../../../helpers/mock-fetch";

const MONITORS_URL = "https://api.perigon.io/v1/api/monitors";
const MONITOR_UUID = "8f14e45f-ceea-4e7a-9c1b-2f3d4a5b6c7d";

const monitorDto: MonitorDto = {
  uuid: MONITOR_UUID,
  name: "Acquisitions",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  status: "DRAFT",
  classificationType: "EVENT",
  monitoringObjective: "Track acquisitions",
  prompt: null,
  dataSchema: null,
  newsletterConfig: null,
  entityGroups: [],
  query: null,
  schedulePolicy: null,
  watchlistId: null,
  contactPointIds: []
};

interface CapturedRequest {
  url: string;
  method?: string;
  body?: unknown;
}

function captureRequests(responseBody: unknown): CapturedRequest[] {
  const requests: CapturedRequest[] = [];
  installFetchMock((input, init) => {
    requests.push({
      url: urlOf(input),
      method: init?.method,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body
    });
    return jsonResponse(responseBody);
  });
  return requests;
}

const text = (r: CallToolResult) => (r.content[0] as { text: string }).text;

const baseCreateInput = {
  name: "Acquisitions",
  classificationType: "EVENT",
  monitoringObjective: "Track acquisitions",
  dataSchema: { schema: { acquirer: { type: "STRING" } } },
  query: { q: "acquisition" }
};

const topicSchedule = {
  intervals: [{ hour: 9, minute: 0, days: ["MONDAY"] }],
  timezoneId: "UTC"
};

afterEach(() => {
  restoreFetch();
});

describe("createMonitor", () => {
  test("defaults status to DRAFT and POSTs the built query", async () => {
    const requests = captureRequests({ data: monitorDto });
    const result = await createMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
      createMonitorArgs.parse(baseCreateInput)
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(MONITORS_URL);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].body).toMatchObject({
      name: "Acquisitions",
      status: "DRAFT",
      classificationType: "EVENT",
      query: { q: "acquisition" }
    });
    expect(text(result)).toContain("Monitor created successfully.");
  });

  test("rejects an ACTIVE TOPIC monitor without a schedule or newsletter config", async () => {
    const requests = captureRequests({ data: monitorDto });
    const handler = createMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders));

    const missingBoth = await handler(
      createMonitorArgs.parse({
        ...baseCreateInput,
        classificationType: "TOPIC",
        status: "ACTIVE"
      })
    );
    const missingNewsletter = await handler(
      createMonitorArgs.parse({
        ...baseCreateInput,
        classificationType: "TOPIC",
        status: "ACTIVE",
        schedulePolicy: topicSchedule
      })
    );
    const missingSchedule = await handler(
      createMonitorArgs.parse({
        ...baseCreateInput,
        classificationType: "TOPIC",
        status: "ACTIVE",
        newsletterConfig: { storyCitationResolvingType: "STORY" }
      })
    );

    for (const result of [missingBoth, missingNewsletter, missingSchedule]) {
      expect(text(result)).toBe(
        "Error: An ACTIVE TOPIC monitor requires both schedulePolicy and newsletterConfig."
      );
    }
    expect(requests).toHaveLength(0);
  });

  test("allows a DRAFT TOPIC monitor without a schedule or newsletter config", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
      createMonitorArgs.parse({ ...baseCreateInput, classificationType: "TOPIC" })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].body).toMatchObject({
      status: "DRAFT",
      classificationType: "TOPIC"
    });
  });

  test("sends schedulePolicy and newsletterConfig for an ACTIVE TOPIC monitor", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
      createMonitorArgs.parse({
        ...baseCreateInput,
        classificationType: "TOPIC",
        status: "ACTIVE",
        schedulePolicy: topicSchedule,
        newsletterConfig: { storyCitationResolvingType: "STORY" }
      })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].body).toMatchObject({
      status: "ACTIVE",
      classificationType: "TOPIC",
      schedulePolicy: {
        intervals: [
          { hour: 9, minute: 0, days: ["MONDAY"], scheduleType: "WEEKLY" }
        ],
        timezoneId: "UTC"
      },
      newsletterConfig: {
        citations: true,
        storyCitationResolvingType: "STORY"
      }
    });
  });
});

describe("updateMonitor", () => {
  test("sends only provided fields and leaves omitted fields out of the PATCH body", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
      updateMonitorArgs.parse({ uuid: MONITOR_UUID, name: "Renamed" })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe(`${MONITORS_URL}/${MONITOR_UUID}`);
    expect(requests[0].method).toBe("PATCH");
    expect(requests[0].body).toEqual({ name: "Renamed" });
  });

  test("sends null and empty arrays when fields are explicitly cleared", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
      updateMonitorArgs.parse({
        uuid: MONITOR_UUID,
        prompt: null,
        newsletterConfig: null,
        schedulePolicy: null,
        watchlistId: null,
        entityGroups: [],
        contactPointIds: []
      })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].body).toEqual({
      prompt: null,
      newsletterConfig: null,
      schedulePolicy: null,
      watchlistId: null,
      entityGroups: [],
      contactPointIds: []
    });
  });

  test("rejects an update with no fields without sending a request", async () => {
    const requests = captureRequests({ data: monitorDto });
    const result = await updateMonitor(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
      updateMonitorArgs.parse({ uuid: MONITOR_UUID })
    );

    expect(text(result)).toBe(
      "Error: At least one monitor field must be provided to update."
    );
    expect(requests).toHaveLength(0);
  });
});

describe("monitor eventType field", () => {
  const perigon = () => new Perigon("test-key", undefined, emptyMcpTelemetryHeaders);
  const sentSchema = (request: CapturedRequest) =>
    (request.body as { dataSchema: { schema: Record<string, unknown> } })
      .dataSchema.schema;

  test("adds a required, non-nullable STRING eventType to a MENTIONS schema", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(perigon())(
      createMonitorArgs.parse({ ...baseCreateInput, classificationType: "MENTIONS" })
    );

    expect(requests).toHaveLength(1);
    expect(sentSchema(requests[0])).toMatchObject({
      acquirer: { type: "STRING" },
      eventType: { type: "STRING", required: true, nullable: false }
    });
  });

  test("forces a nullable or optional eventType to required and non-nullable", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(perigon())(
      createMonitorArgs.parse({
        ...baseCreateInput,
        dataSchema: {
          schema: {
            eventType: {
              type: "ENUM",
              values: ["acquisition", "merger"],
              required: false
            }
          }
        }
      })
    );

    expect(sentSchema(requests[0]).eventType).toEqual({
      type: "ENUM",
      values: ["acquisition", "merger"],
      description: undefined,
      required: true,
      nullable: false
    });
  });

  test("rejects a non-STRING, non-ENUM eventType without sending a request", async () => {
    const requests = captureRequests({ data: monitorDto });
    const result = await createMonitor(perigon())(
      createMonitorArgs.parse({
        ...baseCreateInput,
        dataSchema: { schema: { eventType: { type: "NUMBER" } } }
      })
    );

    expect(text(result)).toBe(
      "Error: EVENT monitors require dataSchema field 'eventType' to be STRING or ENUM, but it is NUMBER."
    );
    expect(requests).toHaveLength(0);
  });

  test("leaves TOPIC schemas unchanged", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(perigon())(
      createMonitorArgs.parse({ ...baseCreateInput, classificationType: "TOPIC" })
    );

    expect(sentSchema(requests[0])).not.toHaveProperty("eventType");
  });

  test("update uses the passed classificationType without fetching the monitor", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(perigon())(
      updateMonitorArgs.parse({
        uuid: MONITOR_UUID,
        classificationType: "MENTIONS",
        dataSchema: { schema: { acquirer: { type: "STRING" } } }
      })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("PATCH");
    expect(sentSchema(requests[0])).toHaveProperty("eventType");
  });

  test("update reads the existing classification when only dataSchema is passed", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(perigon())(
      updateMonitorArgs.parse({
        uuid: MONITOR_UUID,
        dataSchema: { schema: { acquirer: { type: "STRING" } } }
      })
    );

    expect(requests).toHaveLength(2);
    expect(requests[0].url).toBe(`${MONITORS_URL}/${MONITOR_UUID}`);
    expect(requests[0].method ?? "GET").toBe("GET");
    expect(requests[1].method).toBe("PATCH");
    expect(sentSchema(requests[1]).eventType).toMatchObject({
      type: "STRING",
      required: true,
      nullable: false
    });
  });

  test("update leaves an existing TOPIC monitor's schema unchanged", async () => {
    const requests = captureRequests({
      data: { ...monitorDto, classificationType: "TOPIC" }
    });
    await updateMonitor(perigon())(
      updateMonitorArgs.parse({
        uuid: MONITOR_UUID,
        dataSchema: { schema: { acquirer: { type: "STRING" } } }
      })
    );

    expect(requests).toHaveLength(2);
    expect(sentSchema(requests[1])).not.toHaveProperty("eventType");
  });

  test("documents the eventType requirement in the tool and schema", () => {
    expect(createMonitorTool.description).toContain("eventType");
    expect(JSON.stringify(zodToJsonSchema(updateMonitorArgs))).toContain(
      "require an eventType field"
    );
  });
});

describe("monitor social channels", () => {
  const ALL_SOURCES = [SocialSource.X, SocialSource.REDDIT, SocialSource.LINKEDIN];
  const { query: _query, ...socialOnlyBase } = baseCreateInput;
  const perigon = () => new Perigon("test-key", undefined, emptyMcpTelemetryHeaders);

  test("creates an X-only monitor without a news query", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(perigon())(
      buildCreateMonitorArgs([SocialSource.X]).parse({
        ...socialOnlyBase,
        xQuery: { query: "from:nasa" }
      })
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].body).not.toHaveProperty("query");
    expect(requests[0].body).toMatchObject({
      xQuery: { version: "V1", query: "from:nasa", searchType: "LATEST" }
    });
  });

  test("creates a monitor that mixes news with every social channel", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(perigon())(
      buildCreateMonitorArgs(ALL_SOURCES).parse({
        ...baseCreateInput,
        xQuery: { query: "from:nasa", searchType: "TOP" },
        redditQuery: { query: "artemis", subreddit: "space" },
        linkedInQuery: { keyword: "NASA AND Artemis", contentType: "VIDEOS" }
      })
    );

    expect(requests[0].body).toMatchObject({
      query: { q: "acquisition" },
      xQuery: { version: "V1", query: "from:nasa", searchType: "TOP" },
      redditQuery: { version: "V1", query: "artemis", subreddit: "space" },
      linkedInQuery: {
        version: "V1",
        keyword: "NASA AND Artemis",
        contentType: "VIDEOS"
      }
    });
  });

  test("creates a LinkedIn monitor from filters without a keyword", async () => {
    const requests = captureRequests({ data: monitorDto });
    await createMonitor(perigon())(
      buildCreateMonitorArgs([SocialSource.LINKEDIN]).parse({
        ...socialOnlyBase,
        linkedInQuery: {
          fromCompany: [1441],
          fromMember: ["ACoAAA123"],
          contentType: "VIDEOS"
        }
      })
    );

    expect(requests[0].body).toMatchObject({
      linkedInQuery: {
        version: "V1",
        fromCompany: [1441],
        fromMember: ["ACoAAA123"],
        contentType: "VIDEOS"
      }
    });
    expect(requests[0].body).not.toHaveProperty("linkedInQuery.keyword");
  });

  test("rejects a LinkedIn query with only a content type", () => {
    const args = buildCreateMonitorArgs([SocialSource.LINKEDIN]);
    const result = args.safeParse({
      ...socialOnlyBase,
      linkedInQuery: { contentType: "VIDEOS" }
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("needs a keyword or at least one of");
    expect(
      args.safeParse({ ...socialOnlyBase, linkedInQuery: { fromCompany: [] } }).success
    ).toBe(false);
  });

  test("emits the LinkedIn filters without $ref pointers", () => {
    const schema = JSON.stringify(
      zodToJsonSchema(buildUpdateMonitorArgs([SocialSource.LINKEDIN]))
    );
    expect(schema).toContain("authorIndustry");
    expect(schema).not.toContain("$ref");
  });

  test("rejects a create with no news or social query without sending a request", async () => {
    const requests = captureRequests({ data: monitorDto });
    const result = await createMonitor(perigon())(
      buildCreateMonitorArgs([SocialSource.X]).parse(socialOnlyBase)
    );

    expect(text(result)).toBe(
      "Error: Provide query and/or at least one social query (xQuery, redditQuery, linkedInQuery)."
    );
    expect(requests).toHaveLength(0);
  });

  test("sends query null to stop monitoring news", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(perigon())(
      buildUpdateMonitorArgs([SocialSource.X]).parse({
        uuid: MONITOR_UUID,
        query: null
      })
    );

    expect(requests[0].body).toEqual({ query: null });
  });

  test("sends null to remove social channels and leaves omitted ones out", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(perigon())(
      buildUpdateMonitorArgs(ALL_SOURCES).parse({
        uuid: MONITOR_UUID,
        xQuery: null,
        linkedInQuery: null
      })
    );

    expect(requests[0].body).toEqual({ xQuery: null, linkedInQuery: null });
  });

  test("adds a social channel on update", async () => {
    const requests = captureRequests({ data: monitorDto });
    await updateMonitor(perigon())(
      buildUpdateMonitorArgs([SocialSource.REDDIT]).parse({
        uuid: MONITOR_UUID,
        redditQuery: { query: "artemis" }
      })
    );

    expect(requests[0].body).toEqual({
      redditQuery: { version: "V1", query: "artemis" }
    });
  });

  test("exposes only the organization's social channels", () => {
    const createShape = buildCreateMonitorArgs([SocialSource.X]).shape;
    const updateShape = buildUpdateMonitorArgs([SocialSource.X]).shape;

    for (const shape of [createShape, updateShape]) {
      expect(shape).toHaveProperty("xQuery");
      expect(shape).not.toHaveProperty("redditQuery");
      expect(shape).not.toHaveProperty("linkedInQuery");
    }
    expect(createShape.query.isOptional()).toBe(true);
  });

  test("keeps the news-only schema when the organization has no social channels", () => {
    expect(buildCreateMonitorArgs([])).toBe(createMonitorArgs);
    expect(buildUpdateMonitorArgs([])).toBe(updateMonitorArgs);
    expect(createMonitorToolForSources([])).toBe(createMonitorTool);
    expect(createMonitorArgs.shape).not.toHaveProperty("xQuery");
    expect(createMonitorArgs.shape.query.isOptional()).toBe(false);
  });

  test("describes the available social channels in the session tool", () => {
    const create = createMonitorToolForSources([SocialSource.X, SocialSource.LINKEDIN]);
    const update = updateMonitorToolForSources([SocialSource.REDDIT]);

    expect(create.description).toContain("xQuery / linkedInQuery");
    expect(create.description).toContain("Omit query for a social-only monitor.");
    expect(update.description).toContain("redditQuery");
    expect(update.description).toContain("query: null");
  });

  test("shows social queries in monitor detail output", async () => {
    captureRequests({
      data: {
        ...monitorDto,
        xQuery: { version: "V1", query: "from:nasa", searchType: "LATEST" }
      }
    });
    const result = await createMonitor(perigon())(
      buildCreateMonitorArgs([SocialSource.X]).parse({
        ...socialOnlyBase,
        xQuery: { query: "from:nasa" }
      })
    );

    expect(text(result)).toContain('"xQuery": {');
    expect(text(result)).toContain('"query": "from:nasa"');
    expect(text(result)).toContain('"redditQuery": null');
  });
});

describe("setMonitorStatus", () => {
  const cases = [
    { status: "ACTIVE", method: "POST", url: `${MONITORS_URL}/${MONITOR_UUID}/activate` },
    { status: "STOPPED", method: "POST", url: `${MONITORS_URL}/${MONITOR_UUID}/pause` },
    { status: "ARCHIVED", method: "DELETE", url: `${MONITORS_URL}/${MONITOR_UUID}` }
  ] as const;

  for (const { status, method, url } of cases) {
    test(`${status} sends ${method} ${url.replace(MONITORS_URL, "")}`, async () => {
      const requests = captureRequests({ data: { ...monitorDto, status } });
      const result = await setMonitorStatus(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
        setMonitorStatusArgs.parse({ uuid: MONITOR_UUID, status })
      );

      expect(requests).toHaveLength(1);
      expect(requests[0]).toEqual({ url, method, body: undefined });
      expect(text(result)).toContain(`Monitor status changed to ${status}.`);
    });
  }
});

describe("getMonitorNewsletters", () => {
  test("renders a bounded list of story references", async () => {
    const stories: MonitorNewsletterDto["stories"] = {};
    for (let i = 1; i <= 7; i++) {
      stories[`story-${i}`] = {
        slug: `story-${i}`,
        url: `https://perigon.io/stories/${i}`,
        title: `Story ${i}`,
        sourceFavicon: null,
        updatedAt: null,
        createdAt: null
      };
    }
    const newsletter: MonitorNewsletterDto = {
      uuid: "newsletter-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      title: "Weekly briefing",
      content: "Briefing content",
      articles: {},
      stories
    };
    captureRequests({ total: 1, data: [newsletter] });

    const output = text(
      await getMonitorNewsletters(new Perigon("test-key", undefined, emptyMcpTelemetryHeaders))(
        getMonitorNewslettersArgs.parse({ uuid: MONITOR_UUID })
      )
    );

    expect(output).toContain(
      '<story id="story-1" url="https://perigon.io/stories/1">Story 1</story>'
    );
    expect(output).toContain(
      '<story id="story-5" url="https://perigon.io/stories/5">Story 5</story>'
    );
    expect(output).not.toContain('id="story-6"');
    expect(output).toContain(
      "<truncated>2 additional stories omitted.</truncated>"
    );
  });
});
