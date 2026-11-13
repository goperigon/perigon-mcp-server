import { afterEach, describe, expect, test } from "bun:test";
import { Perigon } from "../../../worker/lib/perigon";
import {
  installFetchMock,
  jsonResponse,
  restoreFetch,
  urlOf,
} from "../../helpers/mock-fetch";

afterEach(() => {
  restoreFetch();
});

function captureUrls(): URL[] {
  const urls: URL[] = [];
  installFetchMock((input) => {
    urls.push(new URL(urlOf(input)));
    return jsonResponse({ status: 200, results: [] });
  });
  return urls;
}

describe("Perigon stats queries", () => {
  test("send companyName, labels and showReprints", async () => {
    const urls = captureUrls();
    await new Perigon("k", "https://api.test.local").getArticleCounts({
      companyName: "Toyota",
      label: ["Opinion"],
      excludeLabel: ["Press Release", "Paid-news"],
      showReprints: false,
    });

    const params = urls[0].searchParams;
    expect(params.get("companyName")).toBe("Toyota");
    expect(params.getAll("label")).toEqual(["Opinion"]);
    expect(params.getAll("excludeLabel")).toEqual(["Press Release", "Paid-news"]);
    expect(params.get("showReprints")).toBe("false");
  });

  test("top entities sends expandEntities as entity types", async () => {
    const urls = captureUrls();
    await new Perigon("k", "https://api.test.local").getTopEntities({
      entity: ["people", "journalistsById"],
      expandEntities: ["people", "journalistsById"],
    });

    const params = urls[0].searchParams;
    expect(urls[0].pathname).toBe("/v1/stats/topEntities");
    expect(params.getAll("entity")).toEqual(["people", "journalistsById"]);
    expect(params.getAll("expandEntities")).toEqual(["people", "journalistsById"]);
  });
});
