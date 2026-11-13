import { describe, expect, test } from "bun:test";
import {
  defaultArgs,
  locationArgs,
  paginationArgs,
  resolveCountries,
} from "../../../../worker/mcp/tools/schemas/base";

describe("locationArgs", () => {
  test("countries are not defaulted by the schema; handlers use resolveCountries", () => {
    const result = locationArgs.parse({});
    expect(result.countries).toBeUndefined();
  });

  test("countries are lowercased", () => {
    const result = locationArgs.parse({ countries: ["US", "GB", "Mx"] });
    expect(result.countries).toEqual(["us", "gb", "mx"]);
  });

  test("states are uppercased", () => {
    const result = locationArgs.parse({ states: ["tx", "ny", "Ca"] });
    expect(result.states).toEqual(["TX", "NY", "CA"]);
  });

  test("cities are passed through as-is", () => {
    const result = locationArgs.parse({ cities: ["Austin", "new york"] });
    expect(result.cities).toEqual(["Austin", "new york"]);
  });

  test("undefined states/cities stay undefined", () => {
    const result = locationArgs.parse({});
    expect(result.states).toBeUndefined();
    expect(result.cities).toBeUndefined();
  });
});

describe("paginationArgs", () => {
  test("defaults page to 0 and size to 10", () => {
    const result = paginationArgs.parse({});
    expect(result.page).toBe(0);
    expect(result.size).toBe(10);
  });

  test("rejects negative page numbers", () => {
    expect(() => paginationArgs.parse({ page: -1 })).toThrow();
  });

  test("rejects size below 1 or above 1000", () => {
    expect(() => paginationArgs.parse({ size: 0 })).toThrow();
    expect(() => paginationArgs.parse({ size: 1001 })).toThrow();
  });

  test("accepts the lower and upper bounds for size", () => {
    expect(paginationArgs.parse({ size: 1 }).size).toBe(1);
    expect(paginationArgs.parse({ size: 1000 }).size).toBe(1000);
  });
});

describe("defaultArgs (parseTime)", () => {
  test("empty string transforms to undefined", () => {
    const result = defaultArgs.parse({ from: "", to: "" });
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });

  test("ISO date string parses to Date", () => {
    const result = defaultArgs.parse({
      from: "2024-01-01",
      to: "2024-02-01T12:00:00Z",
    });
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
    expect((result.from as Date).toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect((result.to as Date).toISOString()).toBe("2024-02-01T12:00:00.000Z");
  });

  test("undefined stays undefined", () => {
    const result = defaultArgs.parse({});
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });
});

describe("resolveCountries", () => {
  test("applies the default country when no geographic filter is given", () => {
    expect(resolveCountries(undefined, undefined, [], "")).toEqual({
      country: ["us"],
      defaultCountryApplied: true,
    });
  });

  test("other geographic filters suppress the default", () => {
    expect(resolveCountries(undefined, ["Paris"])).toEqual({
      country: undefined,
      defaultCountryApplied: false,
    });
    expect(resolveCountries(undefined, undefined, undefined, "France")).toEqual(
      { country: undefined, defaultCountryApplied: false }
    );
  });

  test("explicit countries are kept, and [] means all countries", () => {
    expect(resolveCountries(["fr"])).toEqual({
      country: ["fr"],
      defaultCountryApplied: false,
    });
    expect(resolveCountries([])).toEqual({
      country: undefined,
      defaultCountryApplied: false,
    });
  });
});
