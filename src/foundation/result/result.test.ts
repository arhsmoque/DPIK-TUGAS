import { describe, expect, it } from "vitest";
import { err, flatMap, fromThrowable, isErr, isOk, map, mapErr, match, ok } from "./result";

describe("Result", () => {
  it("ok() produces an ok result", () => {
    const result = ok(42);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it("err() produces an err result", () => {
    const result = err("bad_input");
    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);
  });

  it("map transforms only the ok value", () => {
    expect(map(ok(2), (n) => n * 10)).toEqual(ok(20));
    expect(map(err("x"), (n: number) => n * 10)).toEqual(err("x"));
  });

  it("mapErr transforms only the error value", () => {
    expect(mapErr(err("x"), (e) => `wrapped:${e}`)).toEqual(err("wrapped:x"));
    expect(mapErr(ok(2), (e: string) => `wrapped:${e}`)).toEqual(ok(2));
  });

  it("flatMap chains ok results and short-circuits on err", () => {
    const parsePositive = (n: number) => (n > 0 ? ok(n) : err("not_positive" as const));

    expect(flatMap(ok(5), parsePositive)).toEqual(ok(5));
    expect(flatMap(ok(-5), parsePositive)).toEqual(err("not_positive"));
    expect(flatMap(err("upstream" as const), parsePositive)).toEqual(err("upstream"));
  });

  it("match dispatches to the matching handler", () => {
    const describe = (r: ReturnType<typeof ok<number>> | ReturnType<typeof err<string>>) =>
      match(r, { ok: (v) => `ok:${v}`, err: (e) => `err:${e}` });

    expect(describe(ok(1))).toBe("ok:1");
    expect(describe(err("nope"))).toBe("err:nope");
  });

  it("fromThrowable captures a thrown exception as an err", () => {
    const result = fromThrowable(
      () => {
        throw new Error("boom");
      },
      (caught) => (caught instanceof Error ? caught.message : "unknown")
    );

    expect(result).toEqual(err("boom"));
  });

  it("fromThrowable returns ok when no exception is thrown", () => {
    const result = fromThrowable(
      () => 7,
      () => "unreachable"
    );

    expect(result).toEqual(ok(7));
  });
});
