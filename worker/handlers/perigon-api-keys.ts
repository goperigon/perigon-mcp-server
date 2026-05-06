import { fetchPerigonApiKeys } from "../lib/api-keys-utils";
import { handleError } from "../lib/handle-error";
import { validatePerigonAuth } from "../lib/perigon-auth";

/**
 * Returns the authenticated user's enabled Perigon API keys. Requires a valid
 * Perigon session cookie; otherwise responds 401.
 */
export async function handlePerigonApiKeys(
  request: Request,
  _env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return handleError("Method not allowed", 405);
  }

  if (!(await validatePerigonAuth(request))) {
    return handleError("Authentication required", 401);
  }

  try {
    const apiKeys = await fetchPerigonApiKeys(
      request.headers.get("Cookie") || ""
    );
    return Response.json(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return handleError("Failed to fetch API keys", 500);
  }
}
