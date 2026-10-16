import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  defaultArgs,
  locationArgs,
  paginationArgs,
  parseDateParam,
} from "../../../../worker/mcp/tools/schemas/base";

describe("locationArgs", () => {
  test("countries default to ['us']", () => {
    const result = locationArgs.parse({});
    expect(result.countries).toEqual(["us"]);
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

describe("defaultArgs (parseDateParam)", () => {
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

  test("rejects unparseable dates instead of producing an Invalid Date", () => {
    for (const bad of ["last week", "yesterday", "2024-13-45", "7 days ago"]) {
      expect(() => defaultArgs.parse({ from: bad })).toThrow();
      expect(() => defaultArgs.parse({ to: bad })).toThrow();
    }
  });

  test("the rejection names the parameter and the accepted formats", () => {
    const result = defaultArgs.safeParse({ from: "last week" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues[0];
    expect(issue.path).toEqual(["from"]);
    expect(issue.message).toContain('"last week"');
    expect(issue.message).toContain("ISO 8601");
    expect(issue.message).toContain("yyyy-mm-dd");
  });

  test("no accepted value ever survives as an Invalid Date", () => {
    // The failure this guards: an Invalid Date passes schema validation and
    // only blows up later, as `RangeError: Invalid Date`, inside the
    // query-string builder that calls `.toISOString()` on it.
    const result = defaultArgs.safeParse({ from: "not a date" });
    expect(result.success).toBe(false);
    const ok = defaultArgs.parse({ from: "2024-01-01" });
    expect(Number.isNaN((ok.from as Date).getTime())).toBe(false);
    expect(() => (ok.from as Date).toISOString()).not.toThrow();
  });
});

describe("parseDateParam", () => {
  const wrapped = z.string().transform(parseDateParam).optional();

  test("empty string is treated as absent", () => {
    expect(wrapped.parse("")).toBeUndefined();
  });

  test("accepts yyyy-mm-dd and full ISO 8601", () => {
    expect((wrapped.parse("2024-02-01") as Date).toISOString()).toBe(
      "2024-02-01T00:00:00.000Z",
    );
    expect((wrapped.parse("2024-02-01T23:59:59Z") as Date).toISOString()).toBe(
      "2024-02-01T23:59:59.000Z",
    );
  });

  test("rejects relative expressions a model is likely to send", () => {
    expect(() => wrapped.parse("last week")).toThrow();
    expect(() => wrapped.parse("today")).toThrow();
  });
});
