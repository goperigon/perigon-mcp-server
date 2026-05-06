import { handleError } from "../lib/handle-error";

const PERIGON_USER_URL = "https://api.perigon.io/v1/user";

/**
 * Proxy to Perigon's `/v1/user` endpoint that strips Set-Cookie headers
 * (so the upstream response can't clobber the user's session cookies on
 * our domain). Used by the frontend to check whether the visitor is signed
 * in to perigon.io.
 */
export async function handleValidateUser(
  request: Request,
  _env: Env
): Promise<Response> {
  if (request.method !== "GET") {
    return handleError("Method not allowed", 405);
  }

  try {
    const response = await fetch(PERIGON_USER_URL, {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
        "User-Agent": request.headers.get("User-Agent") || "",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return new Response(null, { status: response.status });
    }

    const userData = await response.json();
    return Response.json(userData);
  } catch (error) {
    console.error("Error validating user:", error);
    return handleError("User validation failed", 500);
  }
}
