import type {
  BenchmarkMetrics,
  DownloadMeasurement,
} from "./benchmark-metrics.types";

const BYTES_PER_MEBIBYTE = 1024 ** 2;
const MILLISECONDS_PER_SECOND = 1_000;

export function calculateMetrics(
  measurements: readonly DownloadMeasurement[],
): BenchmarkMetrics {
  if (measurements.length === 0) {
    throw new Error("Для расчёта требуется хотя бы один замер");
  }

  let totalBytes = 0;
  let totalDurationMs = 0;
  for (const { bytes, durationMs } of measurements) {
    totalBytes += bytes;
    totalDurationMs += durationMs;
  }

  if (totalDurationMs <= 0) {
    throw new Error("Суммарное время замеров должно быть больше нуля");
  }

  return {
    requestCount: measurements.length,
    averageDurationMs: totalDurationMs / measurements.length,
    totalBytes,
    mebibytesPerSecond:
      totalBytes /
      BYTES_PER_MEBIBYTE /
      (totalDurationMs / MILLISECONDS_PER_SECOND),
  };
}
