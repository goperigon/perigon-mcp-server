/**
 * Light-weight session validation against Perigon's `/v1/user` endpoint. We
 * forward the user's `Cookie` header and treat any 2xx response as a valid
 * session. Network failures are logged and treated as unauthenticated.
 */
export async function validatePerigonAuth(request: Request): Promise<boolean> {
  try {
    const response = await fetch("https://api.perigon.io/v1/user", {
      headers: {
        Cookie: request.headers.get("Cookie") || "",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error validating Perigon auth:", error);
    return false;
  }
}
