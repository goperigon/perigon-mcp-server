import { z } from "zod";

// Define the Zod schema for API key objects
const ApiKeySchema = z.object({
  key: z.string(),
  id: z.string().optional(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  createdAt: z.string().optional(),
  // Add other fields as needed based on the actual API response
});

// Define the possible response structures from Perigon API
const ApiKeysResponseSchema = z.union([
  // Direct array response
  z.array(ApiKeySchema),
  // Response with data property
  z.object({
    data: z.array(ApiKeySchema),
  }),
  // Response with results property
  z.object({
    results: z.array(ApiKeySchema),
  }),
  // Generic object with unknown structure
  z.record(z.unknown()),
]);

export type ApiKey = z.infer<typeof ApiKeySchema>;

/**
 * Safely parses and extracts API keys from Perigon API response
 * Handles multiple possible response structures with Zod validation
 */
export function parseApiKeysResponse(
  apiKeysResponse: unknown,
  context?: string
): ApiKey[] {
  try {
    const parsedResponse = ApiKeysResponseSchema.parse(apiKeysResponse);

    // Handle direct array response
    if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    }

    // Handle response with data property
    if ("data" in parsedResponse && Array.isArray(parsedResponse.data)) {
      return parsedResponse.data;
    }

    // Handle response with results property
    if ("results" in parsedResponse && Array.isArray(parsedResponse.results)) {
      return parsedResponse.results;
    }

    // If we reach here, it's an unexpected structure
    console.error(
      `Unexpected API keys response structure${
        context ? ` in ${context}` : ""
      }:`,
      parsedResponse
    );
    return [];
  } catch (error) {
    console.error(
      `Failed to parse API keys response${context ? ` in ${context}` : ""}:`,
      error
    );
    return [];
  }
}

/**
 * Fetches API keys from Perigon API with the standard parameters
 */
export async function fetchPerigonApiKeys(
  cookieHeader: string
): Promise<ApiKey[]> {
  const response = await fetch(
    "https://api.perigon.io/v1/apiKeys?size=100&sortBy=createdAt&sortOrder=desc&enabled=true",
    {
      headers: {
        Cookie: cookieHeader,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch API keys: ${response.status}`);
  }

  const apiKeysResponse = await response.json();
  return parseApiKeysResponse(apiKeysResponse, "fetchPerigonApiKeys");
}

/**
 * Gets the first available API key from a list of API keys
 */
export function getFirstApiKey(apiKeys: ApiKey[]): string | null {
  if (apiKeys.length > 0) {
    return apiKeys[0].key;
  }
  return null;
}
