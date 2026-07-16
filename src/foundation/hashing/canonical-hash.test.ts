import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canonicalStringify, hashPayload } from "./canonical-hash";

describe("canonicalStringify", () => {
  it("produces identical output regardless of key insertion order", () => {
    const a = { z: 1, a: 2, m: { d: 4, c: 3 } };
    const b = { a: 2, m: { c: 3, d: 4 }, z: 1 };

    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("sorts keys recursively for arbitrary objects (property)", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.integer()), (obj) => {
        const shuffled = Object.fromEntries(Object.entries(obj).reverse());
        return canonicalStringify(obj) === canonicalStringify(shuffled);
      })
    );
  });
});

describe("hashPayload", () => {
  it("is deterministic for the same logical payload regardless of key order", async () => {
    const a = await hashPayload({ commandType: "AssignWork", actorId: "u1", aggregateId: "w1" });
    const b = await hashPayload({ aggregateId: "w1", commandType: "AssignWork", actorId: "u1" });

    expect(a).toBe(b);
  });

  it("differs for different payloads", async () => {
    const a = await hashPayload({ commandType: "AssignWork" });
    const b = await hashPayload({ commandType: "AcknowledgeAssignment" });

    expect(a).not.toBe(b);
  });

  it("produces a 64-character lowercase hex SHA-256 digest", async () => {
    const digest = await hashPayload({ x: 1 });
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
