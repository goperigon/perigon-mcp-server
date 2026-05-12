import { describe, expect, test } from "bun:test";
import {
  buildChatApiPath,
  createChatTransport,
} from "../../../src/lib/chat-transport";

describe("buildChatApiPath", () => {
  test("omits the tool parameter when all tools are active", () => {
    expect(buildChatApiPath(null)).toBe("/v1/api/chat");
    expect(buildChatApiPath([])).toBe("/v1/api/chat");
  });

  test("adds a single selected tool", () => {
    expect(buildChatApiPath(["search_news_articles"])).toBe(
      "/v1/api/chat?tool=search_news_articles"
    );
  });

  test("adds multiple selected tools as a comma-separated query parameter", () => {
    expect(
      buildChatApiPath(["search_news_articles", "search_people"])
    ).toBe("/v1/api/chat?tool=search_news_articles,search_people");
  });
});

describe("createChatTransport", () => {
  test("reads selected tools at send time from getSelectedTools", async () => {
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    let selectedTools: string[] | null = ["search_news_articles"];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response("fail", { status: 500 });
    }) as typeof fetch;

    try {
      const transport = createChatTransport({
        secret: null,
        perigonKey: null,
        getSelectedTools: () => selectedTools,
        onUnauthorized: () => undefined,
      });

      await expect(sendWithTransport(transport)).rejects.toThrow("fail");

      selectedTools = ["search_people"];

      await expect(sendWithTransport(transport)).rejects.toThrow("fail");

      expect(urls).toEqual([
        "/v1/api/chat?tool=search_news_articles",
        "/v1/api/chat?tool=search_people",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function sendWithTransport(
  transport: ReturnType<typeof createChatTransport>
): Promise<ReadableStream> {
  return transport.sendMessages({
    chatId: "test-chat",
    messages: [],
    abortSignal: undefined,
    body: undefined,
    headers: undefined,
    metadata: undefined,
    trigger: "submit-message",
    messageId: undefined,
  } as Parameters<typeof transport.sendMessages>[0]);
}
