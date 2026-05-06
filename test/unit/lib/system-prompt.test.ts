import { describe, expect, test } from "bun:test";
import { buildSystemPrompt } from "../../../worker/lib/system-prompt";

const FIXED_NOW = new Date("2024-06-15T00:00:00.000Z");

describe("buildSystemPrompt", () => {
  test("substitutes every date placeholder", () => {
    const prompt = buildSystemPrompt(FIXED_NOW);
    expect(prompt).toContain("Today is: 2024-06-15");
    expect(prompt).toContain("- Today: 2024-06-15");
    expect(prompt).toContain("- Yesterday: 2024-06-14");
    expect(prompt).toContain("- 3 days ago: 2024-06-12");
    expect(prompt).toContain("- 1 week ago: 2024-06-08");
    expect(prompt).toContain("- 2 weeks ago: 2024-06-01");
    expect(prompt).toContain("- 1 month ago: 2024-05-16");
  });

  test("leaves no `{{...}}` template tokens behind", () => {
    const prompt = buildSystemPrompt(FIXED_NOW);
    expect(prompt).not.toContain("{{");
  });

  test("identifies the assistant as Cerebro", () => {
    const prompt = buildSystemPrompt(FIXED_NOW);
    expect(prompt).toContain("You are Cerebro");
  });

  test("substitutes both occurrences of {{date}} (replaceAll)", () => {
    const prompt = buildSystemPrompt(FIXED_NOW);
    // The string "2024-06-15" should appear at least twice — once in
    // "Today is: ..." and once in "- Today: ..."
    const occurrences = prompt.split("2024-06-15").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  test("is deterministic for a fixed `now`", () => {
    const a = buildSystemPrompt(FIXED_NOW);
    const b = buildSystemPrompt(FIXED_NOW);
    expect(a).toBe(b);
  });
});
