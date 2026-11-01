import { describe, expect, test } from "bun:test";
import {
  blockedFilterParams,
  dateWindowLimits,
  deriveCapabilities,
  entitlementNoteForTool,
  paginationAllowed,
  strippedArticleFields,
} from "../../../worker/mcp/capabilities";
import { Scopes } from "../../../worker/types/types";

const ALL_SCOPES = Object.values(Scopes);
const NO_SCOPES: Scopes[] = [];

describe("strippedArticleFields", () => {
  test("returns every gated field when scopes are empty", () => {
    const fields = strippedArticleFields(NO_SCOPES);
    expect(fields).toContain("categories");
    expect(fields).toContain("clusterId");
    expect(fields).toContain("source.paywall");
    expect(fields).toContain("sentiment");
    expect(fields.length).toBeGreaterThan(5);
  });

  test("returns empty array when all scopes are present", () => {
    expect(strippedArticleFields(ALL_SCOPES)).toEqual([]);
  });

  test("omits only the fields whose paired scope is present", () => {
    const fields = strippedArticleFields([Scopes.SENTIMENTS, Scopes.TOPICS]);
    expect(fields).not.toContain("sentiment");
    expect(fields).not.toContain("topics");
    expect(fields).toContain("categories");
  });
});

describe("blockedFilterParams", () => {
  test("returns every gated param when scopes are empty", () => {
    const params = blockedFilterParams(NO_SCOPES);
    expect(params).toContain("journalistId");
    expect(params).toContain("companyId");
    expect(params).toContain("topic");
  });

  test("returns empty array when all scopes are present", () => {
    expect(blockedFilterParams(ALL_SCOPES)).toEqual([]);
  });

  test("companies scope unblocks all company-prefixed params together", () => {
    const params = blockedFilterParams([Scopes.COMPANIES]);
    expect(params).not.toContain("companyId");
    expect(params).not.toContain("companyDomain");
    expect(params).not.toContain("excludeCompanyIsin");
    expect(params).toContain("journalistId");
  });
});

describe("paginationAllowed", () => {
  test("false for every family when scopes are empty", () => {
    for (const family of [
      "journalists",
      "sources",
      "people",
      "companies",
      "wikipedia",
    ] as const) {
      expect(paginationAllowed(NO_SCOPES, family)).toBe(false);
    }
  });

  test("true only for the family whose pagination scope is present", () => {
    expect(
      paginationAllowed([Scopes.JOURNALISTS_PAGINATION], "journalists"),
    ).toBe(true);
    expect(paginationAllowed([Scopes.JOURNALISTS_PAGINATION], "sources")).toBe(
      false,
    );
  });
});

describe("dateWindowLimits", () => {
  const now = new Date("2026-08-17T00:00:00.000Z");

  test("clamps both floor and ceiling when neither scope is present", () => {
    const { historicalFloor, realTimeCeiling } = dateWindowLimits(
      NO_SCOPES,
      now,
    );
    expect(historicalFloor).not.toBeNull();
    expect(realTimeCeiling).not.toBeNull();
    expect(historicalFloor!.getTime()).toBe(now.getTime() - 90 * 86_400_000);
    expect(realTimeCeiling!.getTime()).toBe(now.getTime() - 3_600_000);
  });

  test("historicalFloor is null when HISTORICAL_NEWS is present", () => {
    const { historicalFloor } = dateWindowLimits([Scopes.HISTORICAL_NEWS], now);
    expect(historicalFloor).toBeNull();
  });

  test("realTimeCeiling is null when REAL_TIME_NEWS is present", () => {
    const { realTimeCeiling } = dateWindowLimits([Scopes.REAL_TIME_NEWS], now);
    expect(realTimeCeiling).toBeNull();
  });

  test("both limits are null when both scopes are present", () => {
    const limits = dateWindowLimits(
      [Scopes.HISTORICAL_NEWS, Scopes.REAL_TIME_NEWS],
      now,
    );
    expect(limits.historicalFloor).toBeNull();
    expect(limits.realTimeCeiling).toBeNull();
  });
});

describe("deriveCapabilities", () => {
  test("aggregates all sub-derivations for an empty-scope key", () => {
    const report = deriveCapabilities(NO_SCOPES);
    expect(report.strippedArticleFields.length).toBeGreaterThan(0);
    expect(report.blockedFilterParams.length).toBeGreaterThan(0);
    expect(
      Object.values(report.paginationAllowed).every((v) => v === false),
    ).toBe(true);
    expect(report.dateWindowLimits.historicalFloor).not.toBeNull();
    expect(report.hasJournalistEmail).toBe(false);
  });

  test("aggregates a fully-entitled key with no restrictions", () => {
    const report = deriveCapabilities(ALL_SCOPES);
    expect(report.strippedArticleFields).toEqual([]);
    expect(report.blockedFilterParams).toEqual([]);
    expect(
      Object.values(report.paginationAllowed).every((v) => v === true),
    ).toBe(true);
    expect(report.dateWindowLimits.historicalFloor).toBeNull();
    expect(report.dateWindowLimits.realTimeCeiling).toBeNull();
    expect(report.hasJournalistEmail).toBe(true);
  });
});

describe("entitlementNoteForTool", () => {
  test("returns null for a fully-entitled key on a gated tool", () => {
    const report = deriveCapabilities(ALL_SCOPES);
    expect(entitlementNoteForTool("search_journalists", report)).toBeNull();
    expect(entitlementNoteForTool("search_news_articles", report)).toBeNull();
  });

  test("flags pagination restriction for search_journalists", () => {
    const report = deriveCapabilities(NO_SCOPES);
    const note = entitlementNoteForTool("search_journalists", report);
    expect(note).toContain("page > 0");
  });

  test("flags missing journalist email alongside pagination restriction", () => {
    const report = deriveCapabilities(NO_SCOPES);
    const note = entitlementNoteForTool("search_journalists", report);
    expect(note).toContain("email addresses");
    expect(note).toContain("page > 0");
  });

  test("flags stripped article fields for search_news_articles", () => {
    const report = deriveCapabilities(NO_SCOPES);
    const note = entitlementNoteForTool("search_news_articles", report);
    expect(note).toContain("null for:");
    expect(note).toContain("categories");
  });

  test("returns null for a tool with no applicable restrictions", () => {
    const report = deriveCapabilities(NO_SCOPES);
    expect(entitlementNoteForTool("search_topics", report)).toBeNull();
  });

  test("pagination-only tools do not mention journalist email", () => {
    const report = deriveCapabilities(NO_SCOPES);
    const note = entitlementNoteForTool("search_sources", report);
    expect(note).toContain("page > 0");
    expect(note).not.toContain("email");
  });
});
