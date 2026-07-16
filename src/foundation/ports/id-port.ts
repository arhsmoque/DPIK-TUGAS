import { createId } from "../ids/ids";
import type { Brand } from "../ids/brand";

export interface IdPort {
  newId<B extends string>(): Brand<string, B>;
}

export class RandomIdPort implements IdPort {
  newId<B extends string>(): Brand<string, B> {
    return createId<B>();
  }
}

/**
 * Deterministic, non-UUID ids for tests -- never import in application/
 * adapter code. Do not round-trip these through parseId(); they exist for
 * assertions ("the second created id"), not format validation.
 */
export class SequentialIdPort implements IdPort {
  private counter = 0;

  newId<B extends string>(): Brand<string, B> {
    this.counter += 1;
    return `test-id-${this.counter}` as Brand<string, B>;
  }
}
