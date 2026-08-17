/**
 * Type definitions
 */

/**
 * Custom error class for typed fetch
 */
export class HttpError extends Error {
  statusCode: number;
  responseBody: string;
  /** `X-Rate-Limit-Retry-After-Millis`, when the upstream response included it (429s). */
  retryAfterMillis?: number;

  constructor(
    statusCode: number,
    responseBody: string,
    message?: string,
    retryAfterMillis?: number,
  ) {
    super(message || `Request failed with status: ${statusCode}`);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.retryAfterMillis = retryAfterMillis;
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
  organizationId: number;
}

/**
 * Mirrors the API's canonical `BillingPlan.Permission` enum
 * (business-api-server: com.gawq.api.db.model.BillingPlan). Kept as a string
 * enum so unknown/future values returned by introspection are simply ignored
 * rather than causing a type error.
 */
export enum Scopes {
  VECTOR_SEARCH_NEWS = "VECTOR_SEARCH_NEWS",
  VECTOR_SEARCH_CHAT = "VECTOR_SEARCH_CHAT",
  JOURNALISTS = "JOURNALISTS",
  JOURNALISTS_EMAIL = "JOURNALISTS_EMAIL",
  JOURNALISTS_PAGINATION = "JOURNALISTS_PAGINATION",
  PEOPLE = "PEOPLE",
  PEOPLE_PAGINATION = "PEOPLE_PAGINATION",
  HISTORICAL_NEWS = "HISTORICAL_NEWS",
  TOPICS = "TOPICS",
  TAXONOMY = "TAXONOMY",
  ENTITIES = "ENTITIES",
  SENTIMENTS = "SENTIMENTS",
  COMPANIES = "COMPANIES",
  COMPANIES_PAGINATION = "COMPANIES_PAGINATION",
  REAL_TIME_NEWS = "REAL_TIME_NEWS",
  LABELS = "LABELS",
  LOCATIONS = "LOCATIONS",
  REPRINTS = "REPRINTS",
  SOURCES = "SOURCES",
  SOURCES_PAGINATION = "SOURCES_PAGINATION",
  CATEGORIES = "CATEGORIES",
  PAYWALL = "PAYWALL",
  CLUSTERS = "CLUSTERS",
  KEYWORDS = "KEYWORDS",
  WIKIPEDIA = "WIKIPEDIA",
  WIKIPEDIA_PAGINATION = "WIKIPEDIA_PAGINATION",
  VECTOR_SEARCH_WIKIPEDIA = "VECTOR_SEARCH_WIKIPEDIA",
  SEARCH_SUMMARY = "SEARCH_SUMMARY",
  ARTICLE_REFRESH = "ARTICLE_REFRESH",
  LICENCED_NEWS = "LICENCED_NEWS",
  REVIEWS = "REVIEWS",
}

/**
 * Turnstile verification response
 */
export interface TurnstileVerificationResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
}

/**
 * Auth Store
 */
export interface AuthStore {
  count: number;
}
