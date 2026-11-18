import { describe, expect, it } from "vitest";
import { calculateMetrics } from "../../src/domain/benchmark-metrics";

describe("calculateMetrics", () => {
  it("uses total bytes and total time for aggregate throughput", () => {
    expect(
      calculateMetrics([
        { bytes: 1_048_576, durationMs: 250 },
        { bytes: 3_145_728, durationMs: 1_750 },
      ]),
    ).toEqual({
      requestCount: 2,
      averageDurationMs: 1_000,
      totalBytes: 4_194_304,
      mebibytesPerSecond: 2,
    });
  });

  it("reports zero throughput for an empty body", () => {
    expect(
      calculateMetrics([{ bytes: 0, durationMs: 1 }]).mebibytesPerSecond,
    ).toBe(0);
  });

  it("rejects missing measurements and zero elapsed time", () => {
    expect(() => calculateMetrics([])).toThrow("хотя бы один замер");
    expect(() => calculateMetrics([{ bytes: 0, durationMs: 0 }])).toThrow(
      "больше нуля",
    );
  });
});
