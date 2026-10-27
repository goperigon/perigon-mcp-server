import { describe, expect, spyOn, test } from "bun:test";
import { HttpError } from "../../../../worker/types/types";
import {
  getLinkedInCompanyPosts,
  getLinkedInPersonActivity,
  linkedInCompanyPostsArgs,
  linkedInPersonActivityArgs,
} from "../../../../worker/mcp/tools/social/linkedin-feeds";
import {
  linkedInPostsArgs,
  searchLinkedInPosts,
} from "../../../../worker/mcp/tools/social/linkedin-posts";
import {
  redditPostsArgs,
  searchRedditPosts,
} from "../../../../worker/mcp/tools/social/reddit-posts";
import {
  searchXPosts,
  xPostsArgs,
} from "../../../../worker/mcp/tools/social/x-posts";
import {
  createMockPerigon,
  firstCallArgs,
} from "../../../helpers/mock-perigon";

const text = (r: any) => r.content[0].text as string;

describe("search_x_posts", () => {
  test("maps query → q, defaults searchType to LATEST, and prints the next cursor", async () => {
    const perigon = createMockPerigon({
      searchXPosts: async () => ({
        status: 200,
        numResults: 1,
        nextCursor: "c2",
        results: [
          {
            id: "1",
            url: "https://x.com/perigon/status/1",
            text: "hello",
            createdAt: "2026-10-21T10:00:00Z",
            author: { screenName: "perigon" },
            views: 1234,
            likes: 3,
            reposts: null,
            photoUrls: ["https://img.test/a.png"],
          },
        ],
      }),
    });

    const result = await searchXPosts(perigon)(
      xPostsArgs.parse({ query: " openai " }),
    );

    expect(firstCallArgs<any>(perigon.searchXPosts)).toEqual({
      q: "openai",
      searchType: "LATEST",
      cursor: undefined,
    });
    const output = text(result);
    expect(output).toContain(
      '<x_post id="1" url="https://x.com/perigon/status/1" author="@perigon"',
    );
    expect(output).toContain("Engagement: views 1234, likes 3");
    expect(output).not.toContain("reposts");
    expect(output).toContain("Media: 1 photo(s)");
    expect(output).toContain('cursor="c2"');
  });

  test("rejects queries over 512 characters", () => {
    expect(() => xPostsArgs.parse({ query: "a".repeat(513) })).toThrow();
  });

  test("empty last page → noResults", async () => {
    const perigon = createMockPerigon({
      searchXPosts: async () => ({ status: 200, numResults: 0, results: [] }),
    });
    const result = await searchXPosts(perigon)(
      xPostsArgs.parse({ query: "x" }),
    );
    expect(text(result)).toBe("No results found");
  });

  test("social quota errors get quota guidance", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      searchXPosts: async () => {
        throw new HttpError(
          403,
          JSON.stringify({
            status: 403,
            message: "The number of allowed social requests is exceeded",
          }),
        );
      },
    });
    const result = await searchXPosts(perigon)(
      xPostsArgs.parse({ query: "x" }),
    );
    expect(text(result)).toStartWith("Error: Failed to search X posts:");
    expect(text(result)).toContain("exhausted its usage quota");
    errorSpy.mockRestore();
  });
});

describe("search_reddit_posts", () => {
  test("strips r/ from subreddit and drops time unless sort=TOP", async () => {
    const perigon = createMockPerigon({
      searchRedditPosts: async () => ({
        status: 200,
        numResults: 1,
        results: [
          {
            id: "abc",
            title: "Title",
            text: "x".repeat(2000),
            author: "bob",
            subredditPrefixed: "r/devops",
            url: "https://reddit.com/r/devops/abc",
            score: 10,
            numComments: 4,
            isSelf: true,
          },
        ],
      }),
    });

    const result = await searchRedditPosts(perigon)(
      redditPostsArgs.parse({
        query: "kubernetes",
        subreddit: "r/devops",
        sort: "NEW",
        time: "WEEK",
      }),
    );

    expect(firstCallArgs<any>(perigon.searchRedditPosts)).toEqual({
      q: "kubernetes",
      subreddit: "devops",
      sort: "NEW",
      time: undefined,
      cursor: undefined,
    });
    const output = text(result);
    expect(output).toContain('subreddit="r/devops" author="u/bob"');
    expect(output).toContain("Engagement: score 10, comments 4");
    expect(output).toContain("… [truncated]");
    expect(output).toContain("No more results.");
  });

  test("keeps time with sort=TOP", async () => {
    const perigon = createMockPerigon({
      searchRedditPosts: async () => ({
        status: 200,
        numResults: 0,
        results: [],
      }),
    });
    await searchRedditPosts(perigon)(
      redditPostsArgs.parse({ query: "k8s", sort: "TOP", time: "ALL" }),
    );
    expect(firstCallArgs<any>(perigon.searchRedditPosts).time).toBe("ALL");
  });
});

describe("search_linkedin_posts", () => {
  test("forwards filters and prints the next page", async () => {
    const perigon = createMockPerigon({
      searchLinkedInPosts: async () => ({
        status: 200,
        numResults: 1,
        nextPage: 3,
        results: [
          {
            urn: "urn:li:activity:1",
            url: "https://linkedin.com/p/1",
            text: "Hi",
            author: { fullName: "Ann", type: "person" },
            likes: 5,
          },
        ],
      }),
    });

    const result = await searchLinkedInPosts(perigon)(
      linkedInPostsArgs.parse({
        query: "ai",
        sortBy: "DATE_POSTED",
        datePosted: "PAST_WEEK",
        page: 2,
      }),
    );

    expect(firstCallArgs<any>(perigon.searchLinkedInPosts)).toEqual({
      q: "ai",
      sortBy: "DATE_POSTED",
      datePosted: "PAST_WEEK",
      page: 2,
      authorTitle: undefined,
    });
    const output = text(result);
    expect(output).toContain("Author: Ann (person)");
    expect(output).toContain("page=3");
  });
});

describe("LinkedIn feeds", () => {
  const feed = {
    status: 200,
    numResults: 1,
    nextCursor: "next",
    results: [
      {
        activityType: "Repost",
        isRepost: true,
        author: { name: "Ann", occupation: "CEO" },
        sharedPost: { urn: "urn:li:activity:1", text: "Original" },
      },
    ],
  };

  test("person activity defaults type to POSTS and renders shared posts", async () => {
    const perigon = createMockPerigon({
      getLinkedInPersonActivity: async () => feed,
    });

    const result = await getLinkedInPersonActivity(perigon)(
      linkedInPersonActivityArgs.parse({
        url: "https://www.linkedin.com/in/ann",
      }),
    );

    expect(firstCallArgs<any>(perigon.getLinkedInPersonActivity)).toEqual({
      url: "https://www.linkedin.com/in/ann",
      type: "POSTS",
      cursor: undefined,
    });
    const output = text(result);
    expect(output).toContain('<linkedin_post activity_type="Repost">');
    expect(output).toContain("Author: Ann (CEO)");
    expect(output).toContain("<shared_post>");
    expect(output).toContain("Text: Original");
    expect(output).toContain('cursor="next"');
  });

  test("company posts require a URL", () => {
    expect(() => linkedInCompanyPostsArgs.parse({ url: "google" })).toThrow();
  });

  test("company not found surfaces the API message", async () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const perigon = createMockPerigon({
      getLinkedInCompanyPosts: async () => {
        throw new HttpError(
          400,
          JSON.stringify({
            status: 400,
            message:
              "Unable to fetch LinkedIn posts for this URL: Company does not exist.",
          }),
        );
      },
    });

    const result = await getLinkedInCompanyPosts(perigon)(
      linkedInCompanyPostsArgs.parse({
        url: "https://www.linkedin.com/company/missing",
      }),
    );

    expect(text(result)).toContain("Company does not exist.");
    errorSpy.mockRestore();
  });
});
