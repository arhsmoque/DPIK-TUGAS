export interface ClockPort {
  now(): Date;
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

/** Deterministic clock for tests -- never import in application/adapter code. */
export class FixedClock implements ClockPort {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
