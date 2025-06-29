import { TurnstileVerificationResponse } from "worker/types/types";
import { handleError } from "./handle-error";

export async function authenticateChat(request: Request, env: Env) {
  const key = request.headers.get("Authorization")?.split(" ")[1];
  if (key) {
    // env.AUTH_KV.put(key, value)
    env.AUTH_KV.getWithMetadata(key);
  }

  if (env.VITE_USE_TURNSTILE) {
    const token = request.headers.get("cf-turnstile-response");
    const ip = request.headers.get("CF-Connecting-IP");
    // Validate the token by calling the
    // "/siteverify" API endpoint.
    const idempotencyKey = crypto.randomUUID();
    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const verify = await fetch(url, {
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
        idempotency_key: idempotencyKey,
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!((await verify.json()) as TurnstileVerificationResponse).success) {
      return handleError(
        "Bad Request",
        400,
        "Missing or invalid turnstile token",
      );
    }
  }
}
