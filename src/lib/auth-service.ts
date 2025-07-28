export async function authenticateWithTurnstile(
  turnstileToken: string
): Promise<string> {
  const response = await fetch("/v1/auth", {
    method: "POST",
    headers: {
      "cf-turnstile-response": turnstileToken,
    },
  });

  if (!response.ok) {
    throw new Error("Authentication failed");
  }

  const data = (await response.json()) as { secret: string };
  return data.secret;
}
