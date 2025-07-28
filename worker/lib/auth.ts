import { HttpError } from "../types/types";

export async function authenticate(request: Request, env: Env) {
  return "";
  // const key = request.headers.get("Authorization")?.split(" ")[1];

  // if (!key) throw new HttpError(401, "Missing Bearer token");

  // const exists = await env.AUTH_KV.get(key);
  // if (!exists) throw new HttpError(401, "Unauthorized");

  // return key;
}
