export function handleError(error: string, status: number, details?: string) {
  const body = {
    error,
    ...(details && { details }),
  };
  return Response.json(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}
