/**
 * Type definitions
 */

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  toolInvocations?: any[];
}

/**
 * Custom error class for typed fetch
 */
export class HttpError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(statusCode: number, responseBody: string, message?: string) {
    super(message || `Request failed with status: ${statusCode}`);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.name = "HttpError";

    // This is needed for proper instanceof checks in TypeScript
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

/**
 * Response from auth introspection endpoint
 */
export interface AuthIntrospectionResponse {
  scopes: Scopes[];
}

export enum Scopes {
  VECTOR_SEARCH_NEWS = "VECTOR_SEARCH_NEWS",
  JOURNALISTS = "JOURNALISTS",
  PEOPLE = "PEOPLE",
  HISTORICAL_NEWS = "HISTORICAL_NEWS",
  TOPICS = "TOPICS",
  ENTITIES = "ENTITIES",
  SENTIMENTS = "SENTIMENTS",
  COMPANIES = "COMPANIES",
  REAL_TIME_NEWS = "REAL_TIME_NEWS",
  LABELS = "LABELS",
  LOCATIONS = "LOCATIONS",
  REPRINTS = "REPRINTS",
  SOURCES = "SOURCES",
  CATEGORIES = "CATEGORIES",
  PAYWALL = "PAYWALL",
  CLUSTERS = "CLUSTERS",
  KEYWORDS = "KEYWORDS",
}
