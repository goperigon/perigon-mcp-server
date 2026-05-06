import { DefaultChatTransport, type UIMessage } from "ai";

const CHAT_API_PATH = "/v1/api/chat";
const PERIGON_API_KEY_HEADER = "X-Perigon-API-Key";

interface CreateChatTransportArgs {
  /** Auth secret used as the bearer token. */
  secret: string | null;
  /** Selected Perigon API key token (added to the `X-Perigon-API-Key` header). */
  perigonKey: string | null;
  /** Called when the API responds 401 so the caller can invalidate auth. */
  onUnauthorized: () => void;
}

/**
 * Builds a `DefaultChatTransport` configured for the Cerebro chat endpoint.
 *
 *   - Headers are evaluated lazily so the latest auth/Perigon key are sent
 *     with every request.
 *   - The custom `fetch` intercepts 401 responses to trigger auth invalidation
 *     (replaces v4's removed `onResponse` callback).
 */
export function createChatTransport({
  secret,
  perigonKey,
  onUnauthorized,
}: CreateChatTransportArgs): DefaultChatTransport<UIMessage> {
  return new DefaultChatTransport({
    api: CHAT_API_PATH,
    headers: () => buildHeaders({ secret, perigonKey }),
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (response.status === 401) onUnauthorized();
      return response;
    },
  });
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
