import { describe, expect, test } from "bun:test";
import {
  normalizeSplitBy,
  splitByEnum,
  statsFilterArgs,
} from "../../../../worker/mcp/tools/schemas/stats";

describe("statsFilterArgs", () => {
  test("transforms from/to from string to Date", () => {
    const result = statsFilterArgs.parse({
      from: "2024-01-01",
      to: "2024-02-01",
    });
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });

  test("treats empty string as undefined for from/to", () => {
    const result = statsFilterArgs.parse({ from: "", to: "" });
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });

  test("all array filters are optional", () => {
    const result = statsFilterArgs.parse({});
    expect(result.source).toBeUndefined();
    expect(result.sourceGroup).toBeUndefined();
    expect(result.category).toBeUndefined();
    expect(result.topic).toBeUndefined();
    expect(result.language).toBeUndefined();
    expect(result.country).toBeUndefined();
    expect(result.personName).toBeUndefined();
    expect(result.companyDomain).toBeUndefined();
    expect(result.companySymbol).toBeUndefined();
  });

  test("preserves arrays as-is (no case transformation)", () => {
    const result = statsFilterArgs.parse({
      source: ["CNN.com", "nyt.com"],
      country: ["US", "GB"],
    });
    expect(result.source).toEqual(["CNN.com", "nyt.com"]);
    expect(result.country).toEqual(["US", "GB"]);
  });
});

describe("splitByEnum", () => {
  test('defaults to "DAY"', () => {
    expect(splitByEnum.parse(undefined)).toBe("DAY");
  });

  test("accepts each documented value", () => {
    for (const v of ["HOUR", "DAY", "WEEK", "MONTH", "NONE"] as const) {
      expect(splitByEnum.parse(v)).toBe(v);
    }
  });

  test("rejects unknown values and lowercase aliases", () => {
    expect(() => splitByEnum.parse("hour")).toThrow();
    expect(() => splitByEnum.parse("annual")).toThrow();
  });
});

describe("normalizeSplitBy", () => {
  test("undefined → undefined", () => {
    expect(normalizeSplitBy(undefined)).toBeUndefined();
  });

  test("'NONE' → undefined (omitted from API params)", () => {
    expect(normalizeSplitBy("NONE")).toBeUndefined();
  });

  test("everything else is lowercased for the API", () => {
    expect(normalizeSplitBy("HOUR")).toBe("hour");
    expect(normalizeSplitBy("DAY")).toBe("day");
    expect(normalizeSplitBy("WEEK")).toBe("week");
    expect(normalizeSplitBy("MONTH")).toBe("month");
  });
});
