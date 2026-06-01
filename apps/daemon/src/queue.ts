/**
 * Per-lane serialization. Tasks submitted to the same `lane` run strictly one
 * at a time, in submission order; different lanes run independently. This is the
 * daemon's guarantee that two `claude` subprocesses never run on one lane at
 * once (e.g. a scheduled briefing overlapping a manual `--run-now`).
 */
export class LaneQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<T>(lane: string, task: () => Promise<T>): Promise<T> {
    const prevTail = this.tails.get(lane) ?? Promise.resolve();
    // Run after the previous task settles, regardless of its outcome, so one
    // failure doesn't wedge the lane.
    const result = prevTail.then(() => task(), () => task());
    // The stored tail swallows errors (so the next task isn't rejected by a
    // prior failure) while `result` preserves the true outcome for the caller.
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(lane, tail);
    // Drop drained lanes so the map doesn't grow unbounded.
    void tail.then(() => {
      if (this.tails.get(lane) === tail) this.tails.delete(lane);
    });
    return result;
  }
}
