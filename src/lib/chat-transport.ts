import { DefaultChatTransport, type UIMessage } from "ai";

const CHAT_API_PATH = "/v1/api/chat";
const PERIGON_API_KEY_HEADER = "X-Perigon-API-Key";

interface CreateChatTransportArgs {
  /** Auth secret used as the bearer token. */
  secret: string | null;
  /** Selected Perigon API key token (added to the `X-Perigon-API-Key` header). */
  perigonKey: string | null;
  /**
   * Explicit list of tool names to activate. `null` (or omitting) means all
   * tools are active — no `?tool=` parameter is appended to the request URL.
   */
  selectedTools?: string[] | null;
  /**
   * Optional getter used when the transport instance is long-lived. The AI SDK's
   * `useChat` keeps the original transport unless the chat id changes, so this
   * lets each request read the latest tool selection without recreating chat
   * state.
   */
  getSelectedTools?: () => string[] | null;
  /** Called when the API responds 401 so the caller can invalidate auth. */
  onUnauthorized: () => void;
}

/**
 * Builds a `DefaultChatTransport` configured for the Cerebro chat endpoint.
 *
 *   - Headers are evaluated lazily so the latest auth/Perigon key are sent
 *     with every request.
 *   - When `selectedTools` is non-null/non-empty, the tool names are appended
 *     as `?tool=name1,name2` so the backend filters accordingly.
 *   - The custom `fetch` intercepts 401 responses to trigger auth invalidation
 *     (replaces v4's removed `onResponse` callback).
 */
export function createChatTransport({
  secret,
  perigonKey,
  selectedTools,
  getSelectedTools,
  onUnauthorized,
}: CreateChatTransportArgs): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport({
    api: CHAT_API_PATH,
    headers: () => buildHeaders({ secret, perigonKey }),
    fetch: async (input, init) => {
      const tools = getSelectedTools ? getSelectedTools() : selectedTools;
      const response = await fetch(resolveChatApi(input, tools), init);
      if (response.status === 401) onUnauthorized();
      return response;
    },
  });
}

export function buildChatApiPath(selectedTools?: string[] | null): string {
  if (!selectedTools || selectedTools.length === 0) return CHAT_API_PATH;
  const query = selectedTools.map(encodeURIComponent).join(",");
  return `${CHAT_API_PATH}?tool=${query}`;
}

function resolveChatApi(input: RequestInfo | URL, selectedTools?: string[] | null) {
  if (typeof input !== "string" || !input.startsWith(CHAT_API_PATH)) {
    return input;
  }
  return buildChatApiPath(selectedTools);
}

function buildHeaders({
  secret,
  perigonKey,
}: Pick<CreateChatTransportArgs, "secret" | "perigonKey">): Record<
  string,
  string
> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret ?? ""}`,
  };
  if (perigonKey) {
    headers[PERIGON_API_KEY_HEADER] = perigonKey;
  }
  return headers;
}
