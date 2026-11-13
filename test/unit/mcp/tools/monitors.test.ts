import { afterEach, describe, expect, test } from "bun:test";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Perigon } from "../../../../worker/lib/perigon";
import { emptyMcpTelemetryHeaders } from "../../../../worker/lib/telemetry-headers";
import {
  MonitorDto,
  MonitorNewsletterDto
} from "../../../../worker/types/monitors";
import {
  createMonitor,
  createMonitorArgs
} from "../../../../worker/mcp/tools/monitors/create-monitor";
import {
  updateMonitor,
  updateMonitorArgs
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
