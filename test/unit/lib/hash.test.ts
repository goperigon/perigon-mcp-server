import { describe, expect, test } from "bun:test";
import { hashKey } from "../../../worker/lib/hash";

describe("hashKey", () => {
  test("returns a 64-character lowercase hex string", async () => {
    const result = await hashKey("hello");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  test("matches the canonical SHA-256 of a known input", async () => {
    // sha256("hello") == 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const result = await hashKey("hello");
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  test("is deterministic", async () => {
    const a = await hashKey("perigon-key-123");
    const b = await hashKey("perigon-key-123");
    expect(a).toBe(b);
  });

  test("different inputs produce different hashes", async () => {
    const a = await hashKey("a");
    const b = await hashKey("b");
    expect(a).not.toBe(b);
  });

  test("handles empty string", async () => {
    // sha256("") == e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const result = await hashKey("");
    expect(result).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});
