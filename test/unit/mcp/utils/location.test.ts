import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  applyLocationFilter,
  createLocationSchema,
  detectLocationType,
  mergeLocationFilters,
  parseLocation,
  resolveCountryCode,
  resolveStateCode,
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
    expect(detectLocationType("Paris")).toBe("city");
  });

  test("recognizes full US state and country names", () => {
    expect(detectLocationType("Texas")).toBe("state");
    expect(detectLocationType("new york")).toBe("state");
    expect(detectLocationType("France")).toBe("country");
    expect(detectLocationType("United Kingdom")).toBe("country");
  });
});

describe("resolveStateCode", () => {
  test("uppercases codes and maps full names", () => {
    expect(resolveStateCode("tx")).toBe("TX");
    expect(resolveStateCode("Texas")).toBe("TX");
    expect(resolveStateCode(" north  carolina ")).toBe("NC");
    expect(resolveStateCode("District of Columbia")).toBe("DC");
  });

  test("returns undefined for names that are not US states", () => {
    expect(resolveStateCode("Bavaria")).toBeUndefined();
    expect(resolveStateCode("constructor")).toBeUndefined();
    expect(resolveStateCode("toString")).toBeUndefined();
  });
});

describe("resolveCountryCode", () => {
  test("lowercases codes and maps uk to gb", () => {
    expect(resolveCountryCode("FR")).toBe("fr");
    expect(resolveCountryCode("uk")).toBe("gb");
  });

  test("maps English names and common aliases to current ISO codes", () => {
    expect(resolveCountryCode("France")).toBe("fr");
    expect(resolveCountryCode("Germany")).toBe("de");
    expect(resolveCountryCode("United Kingdom")).toBe("gb");
    expect(resolveCountryCode("Great Britain")).toBe("gb");
    expect(resolveCountryCode("United States")).toBe("us");
    expect(resolveCountryCode("USA")).toBe("us");
    expect(resolveCountryCode("the Netherlands")).toBe("nl");
    expect(resolveCountryCode("Vietnam")).toBe("vn");
    expect(resolveCountryCode("Serbia")).toBe("rs");
    expect(resolveCountryCode("Myanmar")).toBe("mm");
    expect(resolveCountryCode("Turkey")).toBe("tr");
    expect(resolveCountryCode("Côte d’Ivoire")).toBe("ci");
    expect(resolveCountryCode("China")).toBe("cn");
  });

  test("returns undefined for unknown names", () => {
    expect(resolveCountryCode("Atlantis")).toBeUndefined();
  });
});

describe("parseLocation", () => {
  test("auto-detect city", () => {
    const result = parseLocation("Austin");
    expect(result.detectedType).toBe("city");
    expect(result.filter).toEqual({ city: ["Austin"] });
  });

  test("Object.prototype property names are treated as cities", () => {
    expect(parseLocation("constructor")).toEqual({
      detectedType: "city",
      filter: { city: ["constructor"] },
    });
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
    const result = parseLocation("Georgia", "country");
    expect(result.detectedType).toBe("country");
    expect(result.filter).toEqual({ country: ["ge"] });
  });

  test("state and country names resolve to codes", () => {
    expect(parseLocation("Texas", "state").filter).toEqual({ state: ["TX"] });
    expect(parseLocation("Germany", "country").filter).toEqual({
      country: ["de"],
    });
    expect(parseLocation("France").filter).toEqual({ country: ["fr"] });
  });

  test("unresolvable state or country names yield no structured filter", () => {
    expect(parseLocation("Bavaria", "state").filter).toEqual({});
    expect(parseLocation("Narnia", "country").filter).toEqual({});
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

  test("adds an unresolvable location to the query as text", () => {
    const out = applyLocationFilter(
      { q: "beer" },
      "Bavaria",
      "state",
      "beer"
    );
    expect(out.q).toBe('(beer) AND "Bavaria"');
    expect(out.state).toBeUndefined();
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
