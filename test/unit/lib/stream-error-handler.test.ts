import { describe, expect, spyOn, test } from "bun:test";
import { InvalidToolInputError, NoSuchToolError } from "ai";
import {
  createStreamErrorHandler,
  logStreamTextError,
} from "../../../worker/lib/stream-error-handler";

describe("createStreamErrorHandler", () => {
  test("returns sanitized message for NoSuchToolError", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const handler = createStreamErrorHandler();
    const err = new NoSuchToolError({ toolName: "fake_tool", availableTools: [] });
    const msg = handler(err);
    expect(msg).toBe("Model tried to call an unknown tool");
    // verbose details are logged, not exposed to the client
    const logged = errorSpy.mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logged).toContain("fake_tool");
    errorSpy.mockRestore();
  });

  test("returns sanitized message for InvalidToolInputError", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const handler = createStreamErrorHandler();
    const err = new InvalidToolInputError({
      toolName: "search_news_articles",
      toolInput: '{"bad":"json"}',
      cause: new Error("schema mismatch"),
    });
    const msg = handler(err);
    expect(msg).toBe("Model called a tool with invalid arguments");
    errorSpy.mockRestore();
  });

  test("falls back to a generic message for unknown errors", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const handler = createStreamErrorHandler();
    expect(handler(new Error("boom"))).toBe("An unknown error occurred");
    expect(handler("just a string")).toBe("An unknown error occurred");
    errorSpy.mockRestore();
  });
});

describe("logStreamTextError", () => {
  test("logs but does not throw", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    expect(() => logStreamTextError({ error: new Error("anything") })).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
