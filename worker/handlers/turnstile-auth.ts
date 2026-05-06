import { TurnstileVerificationResponse } from "../types/types";
import { handleError } from "../lib/handle-error";

const SITE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SECRET_TTL_SECONDS = 60 * 30; // 30 minutes

interface VerifyTurnstileArgs {
  token: string | null;
  ip: string | null;
  secret: string;
}

async function verifyTurnstile(args: VerifyTurnstileArgs): Promise<boolean> {
  const response = await fetch(SITE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: args.secret,
      response: args.token,
      remoteip: args.ip,
      idempotency_key: crypto.randomUUID(),
    }),
  });

  const result = (await response.json()) as TurnstileVerificationResponse;
  return result.success;
}

/**
 * Verifies a Cloudflare Turnstile token and, on success, mints a short-lived
 * session secret stored in `AUTH_KV`. The secret is returned to the client
 * and used as a bearer token for subsequent authenticated calls.
 */
export async function handleTurnstileAuth(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return handleError("Method not allowed", 405);
  }

  const verified = await verifyTurnstile({
    token: request.headers.get("cf-turnstile-response"),
    ip: request.headers.get("CF-Connecting-IP"),
    secret: env.TURNSTILE_SECRET_KEY,
  });

  if (!verified) {
    return handleError(
      "Bad Request",
      400,
      "Missing or invalid turnstile token"
    );
  }

  const secret = crypto.randomUUID();
  await env.AUTH_KV.put(secret, "valid", { expirationTtl: SECRET_TTL_SECONDS });

  return Response.json({ secret });
}
