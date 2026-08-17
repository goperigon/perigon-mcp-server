/**
 * Pure, testable derivations of API-key entitlement behavior from a scope
 * list. Mirrors `ParamsUtils.getArticleConsumer` and the pagination checks in
 * business-api-server (JournalistsController, SourcesController,
 * PeopleSearchController, CompaniesSearchController,
 * WikipediaSearchController) so the model can be told what its own key can
 * and cannot do, instead of silently receiving null fields or 403s.
 *
 * No I/O. No `any`.
 */
import { Scopes } from "../types/types";

/** Article response fields nulled out by `ParamsUtils.getArticleConsumer` when the paired scope is missing. */
const ARTICLE_FIELD_SCOPES: Record<string, Scopes> = {
  categories: Scopes.CATEGORIES,
  clusterId: Scopes.CLUSTERS,
  companies: Scopes.COMPANIES,
  entities: Scopes.ENTITIES,
  matchedAuthors: Scopes.JOURNALISTS,
  keywords: Scopes.KEYWORDS,
  labels: Scopes.LABELS,
  locations: Scopes.LOCATIONS,
  "source.paywall": Scopes.PAYWALL,
  people: Scopes.PEOPLE,
  reprint: Scopes.REPRINTS,
  reprintGroupId: Scopes.REPRINTS,
  sentiment: Scopes.SENTIMENTS,
  topics: Scopes.TOPICS,
};

/** Article request params that 403 with `"'<param>' parameter is not supported by your plan"` when the paired scope is missing. */
const ARTICLE_FILTER_PARAM_SCOPES: Record<string, Scopes> = {
  category: Scopes.CATEGORIES,
  expandCluster: Scopes.CLUSTERS,
  clusterId: Scopes.CLUSTERS,
  companyId: Scopes.COMPANIES,
  companyDomain: Scopes.COMPANIES,
  companySymbol: Scopes.COMPANIES,
  companyName: Scopes.COMPANIES,
  hasCompanies: Scopes.COMPANIES,
  excludeCompanyId: Scopes.COMPANIES,
  excludeCompanyDomain: Scopes.COMPANIES,
  excludeCompanySymbol: Scopes.COMPANIES,
  companyIsin: Scopes.COMPANIES,
  excludeCompanyIsin: Scopes.COMPANIES,
  journalistId: Scopes.JOURNALISTS,
  excludeJournalistId: Scopes.JOURNALISTS,
  label: Scopes.LABELS,
  topic: Scopes.TOPICS,
};

/** Entity family → the `*_PAGINATION` permission that must be present for `page > 0` to succeed. */
const PAGINATION_SCOPES: Record<
  "journalists" | "sources" | "people" | "companies" | "wikipedia",
  Scopes
> = {
  journalists: Scopes.JOURNALISTS_PAGINATION,
  sources: Scopes.SOURCES_PAGINATION,
  people: Scopes.PEOPLE_PAGINATION,
  companies: Scopes.COMPANIES_PAGINATION,
  wikipedia: Scopes.WIKIPEDIA_PAGINATION,
};

/** `HISTORICAL_NEWS`-restricted lookback window, in days, per business-api-server `NewsSearchLimits`. */
const DEFAULT_HISTORICAL_LOOKUP_DAYS = 90;

/** `REAL_TIME_NEWS`-restricted delay applied to `to`, per `ParamsUtils.REAL_TIME_NEWS_DELAY`. */
const REAL_TIME_NEWS_DELAY_HOURS = 1;

function hasScope(scopes: Scopes[], scope: Scopes): boolean {
  return scopes.includes(scope);
}

/**
 * Article response fields that will come back `null` for this key, keyed by
 * the exact field path used in the article formatter (dotted for nested
 * fields, e.g. `source.paywall`).
 */
export function strippedArticleFields(scopes: Scopes[]): string[] {
  return Object.entries(ARTICLE_FIELD_SCOPES)
    .filter(([, scope]) => !hasScope(scopes, scope))
    .map(([field]) => field);
}

/**
 * Article search filter params that will 403 with "parameter is not
 * supported by your plan" for this key.
 */
export function blockedFilterParams(scopes: Scopes[]): string[] {
  return Object.entries(ARTICLE_FILTER_PARAM_SCOPES)
    .filter(([, scope]) => !hasScope(scopes, scope))
    .map(([param]) => param);
}

/**
 * Whether `page > 0` is allowed for a given entity family. Article search
 * pagination is not permission-gated upstream; only journalists, sources,
 * people, companies, and Wikipedia are.
 */
export function paginationAllowed(
  scopes: Scopes[],
  family: keyof typeof PAGINATION_SCOPES,
): boolean {
  return hasScope(scopes, PAGINATION_SCOPES[family]);
}

export interface DateWindowLimits {
  /** Earliest `from` this key may query, or `null` if HISTORICAL_NEWS is present (no clamp). */
  historicalFloor: Date | null;
  /** Latest `to` this key may query, or `null` if REAL_TIME_NEWS is present (no clamp). */
  realTimeCeiling: Date | null;
}

/**
 * Silent date-window clamps applied by `ParamsUtils.adjustParams`: without
 * `HISTORICAL_NEWS`, `from` is floored to `now - lookupDays`; without
 * `REAL_TIME_NEWS`, `to` is capped at `now - 1h`. Both clamps happen with
 * HTTP 200, not a 403, so a caller reading only the response can mistake the
 * clamped window for "no coverage" outside it.
 */
export function dateWindowLimits(
  scopes: Scopes[],
  now: Date = new Date(),
): DateWindowLimits {
  const historicalFloor = hasScope(scopes, Scopes.HISTORICAL_NEWS)
    ? null
    : new Date(now.getTime() - DEFAULT_HISTORICAL_LOOKUP_DAYS * 86_400_000);
  const realTimeCeiling = hasScope(scopes, Scopes.REAL_TIME_NEWS)
    ? null
    : new Date(now.getTime() - REAL_TIME_NEWS_DELAY_HOURS * 3_600_000);
  return { historicalFloor, realTimeCeiling };
}

export interface CapabilityReport {
  strippedArticleFields: string[];
  blockedFilterParams: string[];
  paginationAllowed: Record<keyof typeof PAGINATION_SCOPES, boolean>;
  dateWindowLimits: DateWindowLimits;
  hasJournalistEmail: boolean;
}

/** Convenience aggregate combining all derivations for a single scope list. */
export function deriveCapabilities(
  scopes: Scopes[],
  now: Date = new Date(),
): CapabilityReport {
  return {
    strippedArticleFields: strippedArticleFields(scopes),
    blockedFilterParams: blockedFilterParams(scopes),
    paginationAllowed: {
      journalists: paginationAllowed(scopes, "journalists"),
      sources: paginationAllowed(scopes, "sources"),
      people: paginationAllowed(scopes, "people"),
      companies: paginationAllowed(scopes, "companies"),
      wikipedia: paginationAllowed(scopes, "wikipedia"),
    },
    dateWindowLimits: dateWindowLimits(scopes, now),
    hasJournalistEmail: hasScope(scopes, Scopes.JOURNALISTS_EMAIL),
  };
}

/**
 * Short, tool-description-safe note for a restriction relevant to a specific
 * tool, or `null` if nothing applies. Kept to one clause per note to avoid
 * inflating the always-on schema size (see instructions.ts context-budget
 * notes for the same principle applied to `.describe()` text).
 */
export function entitlementNoteForTool(
  toolName: string,
  report: CapabilityReport,
): string | null {
  const notes: string[] = [];

  const paginationFamily = (
    {
      search_journalists: "journalists",
      search_sources: "sources",
      search_people: "people",
      search_companies: "companies",
      search_wikipedia: "wikipedia",
    } as const
  )[toolName];
  if (paginationFamily && !report.paginationAllowed[paginationFamily]) {
    notes.push("This key cannot use page > 0 on this endpoint (will 403).");
  }

  if (
    toolName === "search_news_articles" &&
    report.strippedArticleFields.length > 0
  ) {
    notes.push(
      `This key will always receive null for: ${report.strippedArticleFields.join(", ")}.`,
    );
  }

  if (toolName === "search_journalists" && !report.hasJournalistEmail) {
    notes.push("This key cannot see journalist email addresses.");
  }

  return notes.length > 0 ? notes.join(" ") : null;
}
