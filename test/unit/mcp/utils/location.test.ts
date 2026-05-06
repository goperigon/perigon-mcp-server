import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  applyLocationFilter,
  createLocationSchema,
  detectLocationType,
  mergeLocationFilters,
  parseLocation,
} from "../../../../worker/mcp/tools/utils/location";

describe("detectLocationType", () => {
  test("recognizes 2-letter US state codes", () => {
    expect(detectLocationType("TX")).toBe("state");
    expect(detectLocationType("ny")).toBe("state");
  });

  test("recognizes 2-letter country codes (only when not also a US-state code)", () => {
    // US_STATES is checked BEFORE COMMON_COUNTRIES, so any 2-letter code that
    // exists in both lists (de, ca, in) is treated as a state. Pin that.
    expect(detectLocationType("DE")).toBe("state"); // Delaware wins over Germany
    expect(detectLocationType("ca")).toBe("state"); // California wins over Canada
    // Codes that exist only in COMMON_COUNTRIES still detect as country.
    expect(detectLocationType("us")).toBe("country");
    expect(detectLocationType("jp")).toBe("country");
    expect(detectLocationType("FR")).toBe("country");
  });

  test("treats descriptors with city/county/town/village as cities", () => {
    expect(detectLocationType("Travis County")).toBe("city");
    expect(detectLocationType("Kansas City")).toBe("city");
    expect(detectLocationType("Smalltown")).toBe("city");
    expect(detectLocationType("Some Village")).toBe("city");
  });

  test("defaults longer names to city", () => {
    expect(detectLocationType("Austin")).toBe("city");
    expect(detectLocationType("Mountain View")).toBe("city");
  });
});

describe("parseLocation", () => {
  test("auto-detect city", () => {
    const result = parseLocation("Austin");
    expect(result.detectedType).toBe("city");
    expect(result.filter).toEqual({ city: ["Austin"] });
  });

  test("auto-detect state uppercases the value", () => {
    const result = parseLocation("tx");
    expect(result.detectedType).toBe("state");
    expect(result.filter).toEqual({ state: ["TX"] });
  });

  test("auto-detect country lowercases the value", () => {
    // Use FR — not in US_STATES, so it routes to country.
    const result = parseLocation("FR");
    expect(result.detectedType).toBe("country");
    expect(result.filter).toEqual({ country: ["fr"] });
  });

  test("explicit type overrides auto detection", () => {
    const result = parseLocation("Texas", "state");
    expect(result.detectedType).toBe("state");
    expect(result.filter).toEqual({ state: ["TEXAS"] });
  });

  test("explicit country lowercases", () => {
    const result = parseLocation("Germany", "country");
    expect(result.filter).toEqual({ country: ["germany"] });
  });
});

describe("mergeLocationFilters", () => {
  test("appends arrays without overwriting", () => {
    const merged = mergeLocationFilters(
      { city: ["Austin"], country: ["us"] },
      { city: ["Dallas"], state: ["NY"] }
    );
    expect(merged.city).toEqual(["Austin", "Dallas"]);
    expect(merged.state).toEqual(["NY"]);
    expect(merged.country).toEqual(["us"]);
  });

  test("does not mutate the input", () => {
    const original = { city: ["A"] };
    mergeLocationFilters(original, { city: ["B"] });
    expect(original).toEqual({ city: ["A"] });
  });
});

describe("applyLocationFilter", () => {
  test("returns input untouched when location is omitted", () => {
    const params = { q: "AI" };
    expect(applyLocationFilter({ ...params }, undefined)).toEqual(params);
  });

  test("merges the parsed location filter into params", () => {
    const params: any = { state: ["CA"] };
    const out = applyLocationFilter(params, "ny", "auto");
    expect(out.state).toEqual(["CA", "NY"]);
  });

  test("uses location as the query when no query is provided", () => {
    const out = applyLocationFilter({}, "Austin", "auto");
    expect(out.q).toBe("Austin");
  });

  test("does not overwrite an existing query", () => {
    const out = applyLocationFilter({ q: "trump" }, "Austin", "auto", "trump");
    expect(out.q).toBe("trump");
  });
});

describe("createLocationSchema", () => {
  test("returns valid zod fields with defaults", () => {
    const schema = z.object(createLocationSchema());
    const result = schema.parse({ location: "Austin" });
    expect(result.location).toBe("Austin");
    expect(result.locationType).toBe("auto");
  });

  test("rejects empty location strings", () => {
    const schema = z.object(createLocationSchema());
    expect(() => schema.parse({ location: "" })).toThrow();
  });

  test("rejects invalid location types", () => {
    const schema = z.object(createLocationSchema());
    expect(() =>
      schema.parse({ location: "Austin", locationType: "planet" })
    ).toThrow();
  });
});
