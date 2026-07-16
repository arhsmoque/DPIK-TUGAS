import { describe, expect, it } from "vitest";
import { FixedClock, SystemClock } from "./clock-port";
import { RandomIdPort, SequentialIdPort } from "./id-port";

describe("ClockPort", () => {
  it("SystemClock returns the current time", () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it("FixedClock returns the same instant until advanced", () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));

    expect(clock.now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-01-01T00:00:00.000Z");

    clock.advance(60_000);

    expect(clock.now().toISOString()).toBe("2026-01-01T00:01:00.000Z");
  });
});

describe("IdPort", () => {
  it("RandomIdPort produces distinct UUID-shaped ids", () => {
    const port = new RandomIdPort();
    const a = port.newId<"WorkThreadId">();
    const b = port.newId<"WorkThreadId">();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("SequentialIdPort produces deterministic, incrementing ids", () => {
    const port = new SequentialIdPort();

    expect(port.newId<"WorkThreadId">()).toBe("test-id-1");
    expect(port.newId<"WorkThreadId">()).toBe("test-id-2");
  });
});
