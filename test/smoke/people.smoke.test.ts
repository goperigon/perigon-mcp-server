import { describe, expect, test } from "bun:test";
import { realFetch } from "../setup";
import { getResultText } from "../helpers/fixtures";
import {
  peopleArgs,
  searchPeople,
} from "../../worker/mcp/tools/search/people";
import { Perigon } from "../../worker/lib/perigon";

const apiKey = process.env.PERIGON_API_KEY ?? "";
const skip = !apiKey;
if (!skip) globalThis.fetch = realFetch;

describe.skipIf(skip)("smoke: search_people", () => {
  test("returns people for a known public figure", async () => {
    const perigon = new Perigon(apiKey);
    const result = await searchPeople(perigon)(
      peopleArgs.parse({ name: "Sam Altman", size: 1 })
    );
    expect(getResultText(result)).not.toContain("Error:");
  }, 30_000);
});
