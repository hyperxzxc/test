import { Module } from "@nestjs/common";
import { BenchmarkDownload } from "./application/benchmark-download";
import {
  DOWNLOAD_CLIENT,
  type DownloadClient,
} from "./application/download-client.port";
import { BENCHMARK_CONFIG } from "./config/benchmark.config";
import { HttpDownloadClient } from "./infrastructure/http-download-client";

@Module({
  providers: [
    {
      provide: DOWNLOAD_CLIENT,
      useFactory: () =>
        new HttpDownloadClient(BENCHMARK_CONFIG.requestTimeoutMs),
    },
    {
      provide: BenchmarkDownload,
      inject: [DOWNLOAD_CLIENT],
      useFactory: (client: DownloadClient) =>
        new BenchmarkDownload(client, BENCHMARK_CONFIG.requestCount),
    },
  ],
})
export class BenchmarkModule {}
