import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { InvalidToolInputError, NoSuchToolError } from "ai";
import { z } from "zod";

// Loosely typed so individual tests can mockImplementationOnce with whatever
// shape `generateObject` should return for that case.
const generateObjectMock = mock<(...args: any[]) => Promise<{ object: any }>>(
  async () => ({ object: { fixed: true } })
);

// Replace `generateObject` from the ai package before importing the module
// under test. `mock.module` rewrites the resolution graph for the rest of the
// test process.
await mock.module("ai", () => {
  const actual = require("ai");
  return {
    ...actual,
    generateObject: generateObjectMock,
  };
});

const { createRepairToolCall } = await import(
  "../../../worker/lib/repair-tool-call"
);

const fakeAnthropic = ((modelId: string) => ({ modelId } as unknown)) as any;

const tools = {
  some_tool: {
    inputSchema: z.object({ foo: z.string() }),
  },
} as const;

const fakeInputSchemaFn = (_args: { toolName: string }) => ({ type: "object" });

beforeEach(() => {
  generateObjectMock.mockClear();
});

afterEach(() => {
  generateObjectMock.mockClear();
});

describe("createRepairToolCall", () => {
  test("repairs InvalidToolInputError using generateObject", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    generateObjectMock.mockImplementationOnce(async () => ({
      object: { foo: "bar" },
    }));
    const repair = createRepairToolCall<typeof tools>(fakeAnthropic, "claude-x");
    const error = new InvalidToolInputError({
      toolName: "some_tool",
      toolInput: '{"foo":42}',
      cause: new Error("schema mismatch"),
    });

    const result = await repair({
      toolCall: {
        type: "tool-call",
        toolCallId: "tc-1",
        toolName: "some_tool",
        input: '{"foo":42}',
      } as any,
      tools,
      error,
      inputSchema: fakeInputSchemaFn as any,
      messages: [],
      system: undefined,
    } as any);

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      type: "tool-call",
      toolCallId: "tc-1",
      toolName: "some_tool",
    });
    expect((result as { input: string }).input).toBe(
      JSON.stringify({ foo: "bar" })
    );
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });

  test("returns null when InvalidToolInputError refers to an unknown tool", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const repair = createRepairToolCall<typeof tools>(fakeAnthropic, "claude-x");
    const error = new InvalidToolInputError({
      toolName: "missing_tool",
      toolInput: "{}",
      cause: new Error("nope"),
    });

    const result = await repair({
      toolCall: {
        type: "tool-call",
        toolCallId: "tc-2",
        toolName: "missing_tool",
        input: "{}",
      } as any,
      tools,
      error,
      inputSchema: fakeInputSchemaFn as any,
      messages: [],
      system: undefined,
    } as any);

    expect(result).toBeNull();
    expect(generateObjectMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("returns null when generateObject throws", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    generateObjectMock.mockImplementationOnce(async () => {
      throw new Error("upstream LLM exploded");
    });

    const repair = createRepairToolCall<typeof tools>(fakeAnthropic, "claude-x");
    const error = new InvalidToolInputError({
      toolName: "some_tool",
      toolInput: "{}",
      cause: new Error("schema"),
    });

    const result = await repair({
      toolCall: {
        type: "tool-call",
        toolCallId: "tc-3",
        toolName: "some_tool",
        input: "{}",
      } as any,
      tools,
      error,
      inputSchema: fakeInputSchemaFn as any,
      messages: [],
      system: undefined,
    } as any);

    expect(result).toBeNull();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test("returns null for NoSuchToolError", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const repair = createRepairToolCall<typeof tools>(fakeAnthropic, "claude-x");
    const error = new NoSuchToolError({
      toolName: "ghost",
      availableTools: ["some_tool"],
    });

    const result = await repair({
      toolCall: {
        type: "tool-call",
        toolCallId: "tc-4",
        toolName: "ghost",
        input: "{}",
      } as any,
      tools,
      error,
      inputSchema: fakeInputSchemaFn as any,
      messages: [],
      system: undefined,
    } as any);

    expect(result).toBeNull();
    expect(generateObjectMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test("returns null for unknown error types", async () => {
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    const repair = createRepairToolCall<typeof tools>(fakeAnthropic, "claude-x");
    const error = new Error("totally unrelated");

    const result = await repair({
      toolCall: {
        type: "tool-call",
        toolCallId: "tc-5",
        toolName: "some_tool",
        input: "{}",
      } as any,
      tools,
      error,
      inputSchema: fakeInputSchemaFn as any,
      messages: [],
      system: undefined,
    } as any);

    expect(result).toBeNull();
    expect(generateObjectMock).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
