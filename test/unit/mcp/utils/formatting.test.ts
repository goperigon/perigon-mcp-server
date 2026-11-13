import { describe, expect, test } from "bun:test";
import {
  createCurrentPageHeader,
  createPaginationHeader,
  describeDefaultCountry,
  formatLabel,
  formatLabelList,
  formatWikidataDate,
  noResults,
  SINGLE_COUNTRY_HINT,
  toolResult,
  withDefaultCountryNote,
} from "../../../../worker/mcp/tools/utils/formatting";

describe("toolResult", () => {
  test("wraps a string in a CallToolResult content array", () => {
    expect(toolResult("hello")).toEqual({
      content: [{ type: "text", text: "hello" }],
    });
  });
});

describe("noResults", () => {
  test("is a fixed CallToolResult", () => {
    expect(noResults).toEqual({
      content: [{ type: "text", text: "No results found" }],
    });
  });
});

describe("createPaginationHeader", () => {
  test("computes 0-indexed page-of-pages", () => {
    expect(createPaginationHeader(100, 0, 10, "articles")).toBe(
      "Got 100 articles (page 0 of 9)"
    );
  });

  test("rounds up partial pages", () => {
    expect(createPaginationHeader(13, 0, 5, "items")).toBe(
      "Got 13 items (page 0 of 2)"
    );
  });

  test("produces the documented (page X of Y-1) shape on a final page", () => {
    expect(createPaginationHeader(20, 1, 10, "stories")).toBe(
      "Got 20 stories (page 1 of 1)"
    );
  });
});

describe("createCurrentPageHeader", () => {
  test("reports current page details without implying a known total", () => {
    expect(createCurrentPageHeader(15, 50, 15, "articles")).toBe(
      "Returned 15 articles (page 50, requested size 15)"
    );
  });
});

describe("formatLabelList", () => {
  test('returns "N/A" for null/undefined/empty arrays', () => {
    expect(formatLabelList(null)).toBe("N/A");
    expect(formatLabelList(undefined)).toBe("N/A");
    expect(formatLabelList([])).toBe("N/A");
  });

  test("joins object labels with comma-space", () => {
    expect(formatLabelList([{ label: "a" }, { label: "b" }])).toBe("a, b");
  });

  test("accepts plain strings alongside objects", () => {
    expect(formatLabelList(["a", { label: "b" }])).toBe("a, b");
  });

  test("filters out null/empty entries", () => {
    expect(
      formatLabelList([null, { label: "a" }, { label: "" }, undefined])
    ).toBe("a");
  });

  test("uses the supplied fallback when nothing remains", () => {
    expect(formatLabelList([null, undefined], "—")).toBe("—");
  });
});

describe("formatLabel", () => {
  test("returns the trimmed label", () => {
    expect(formatLabel({ label: "  CEO  " })).toBe("CEO");
  });

  test("falls back to N/A for missing values", () => {
    expect(formatLabel(null)).toBe("N/A");
    expect(formatLabel(undefined)).toBe("N/A");
    expect(formatLabel({})).toBe("N/A");
    expect(formatLabel({ label: "" })).toBe("N/A");
    expect(formatLabel({ label: null })).toBe("N/A");
  });

  test("supports a custom fallback", () => {
    expect(formatLabel(null, "unknown")).toBe("unknown");
  });
});

describe("formatWikidataDate", () => {
  test("returns the date portion of an ISO timestamp", () => {
    expect(
      formatWikidataDate({ time: "1980-05-04T00:00:00.000Z", precision: "day" })
    ).toBe("1980-05-04");
  });

  test("falls back when time is missing", () => {
    expect(formatWikidataDate(null)).toBe("N/A");
    expect(formatWikidataDate({})).toBe("N/A");
    expect(formatWikidataDate({ time: null })).toBe("N/A");
  });

  test("supports a custom fallback", () => {
    expect(formatWikidataDate(null, "?")).toBe("?");
  });
});

describe("withDefaultCountryNote", () => {
  test("returns the text unchanged when the default was not applied", () => {
    expect(withDefaultCountryNote("body", false)).toBe("body");
  });

  test("prefixes a note naming the default country and how to change it", () => {
    expect(withDefaultCountryNote("body", true)).toBe(
      "<note>No country filter was given, so the default country filter was applied: us. Pass countries to search other countries, or countries: [] for all countries.</note>\n\nbody"
    );
  });

  test("accepts a tool-specific hint", () => {
    expect(withDefaultCountryNote("body", true, SINGLE_COUNTRY_HINT)).toContain(
      `applied: us. ${SINGLE_COUNTRY_HINT}</note>`
    );
  });
});

describe("describeDefaultCountry", () => {
  test("lists the filters that suppress the default", () => {
    expect(describeDefaultCountry(["countries", "cities", "states"])).toBe(
      "Country default: when none of countries, cities or states is given, results are filtered to country us and the response starts with a <note> saying the default was applied; pass countries to choose others, or countries: [] for all countries."
    );
  });

  test("handles a single filter and a custom hint", () => {
    expect(describeDefaultCountry(["country"], "pass country")).toBe(
      "Country default: when country is not given, results are filtered to country us and the response starts with a <note> saying the default was applied; pass country."
    );
  });
});
