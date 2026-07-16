import { describe, expect, it } from "vitest";
import { createId, parseId } from "./ids";
import { isErr, isOk } from "../result/result";
import type { WorkThreadId } from "./ids";

describe("ids", () => {
  it("createId produces a well-formed UUID", () => {
    const id = createId<"WorkThreadId">();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("createId produces distinct values across calls", () => {
    const a = createId<"WorkThreadId">();
    const b = createId<"WorkThreadId">();
    expect(a).not.toBe(b);
  });

  it("parseId accepts a well-formed UUID and brands it", () => {
    const raw = createId<"WorkThreadId">();
    const result = parseId<"WorkThreadId">(raw);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const branded: WorkThreadId = result.value;
      expect(branded).toBe(raw);
    }
  });

  it("parseId rejects a malformed id", () => {
    const result = parseId<"WorkThreadId">("not-a-uuid");

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual({ type: "invalid_id", raw: "not-a-uuid" });
    }
  });
});
