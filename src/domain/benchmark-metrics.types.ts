export interface DownloadMeasurement {
  readonly bytes: number;
  readonly durationMs: number;
}

export interface BenchmarkMetrics {
  readonly requestCount: number;
  readonly averageDurationMs: number;
  readonly totalBytes: number;
  readonly mebibytesPerSecond: number;
}
