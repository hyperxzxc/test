import { performance } from "node:perf_hooks";
import { calculateMetrics } from "../domain/benchmark-metrics";
import type {
  BenchmarkMetrics,
  DownloadMeasurement,
} from "../domain/benchmark-metrics.types";
import type { DownloadClient } from "./download-client.port";

export class BenchmarkDownload {
  constructor(
    private readonly client: DownloadClient,
    private readonly requestCount: number,
  ) {}

  async run(url: URL): Promise<BenchmarkMetrics> {
    const measurements: DownloadMeasurement[] = [];

    for (let attempt = 1; attempt <= this.requestCount; attempt += 1) {
      const startedAt = performance.now();

      try {
        const bytes = await this.client.download(url);
        measurements.push({ bytes, durationMs: performance.now() - startedAt });
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`Запрос ${attempt}/${this.requestCount}: ${detail}`, {
          cause,
        });
      }
    }

    return calculateMetrics(measurements);
  }
}
