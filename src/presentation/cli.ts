import type { BenchmarkMetrics } from "../domain/benchmark-metrics.types";

export const USAGE = 'Использование: npm start -- "https://example.com/"';

export function parseUrl(args: readonly string[]): URL {
  const [address] = args;
  if (args.length !== 1 || !address) {
    throw new Error("Укажите один URL");
  }

  const url = URL.parse(address);
  if (url?.protocol !== "http:" && url?.protocol !== "https:") {
    throw new Error("Укажите корректный URL с протоколом http или https");
  }

  return url;
}

export function formatMetrics(metrics: BenchmarkMetrics): string {
  return [
    `Запросов: ${metrics.requestCount}`,
    `Среднее время запроса: ${metrics.averageDurationMs.toFixed(2)} мс`,
    `Общий объём: ${metrics.totalBytes} байт`,
    `Скорость скачивания: ${metrics.mebibytesPerSecond.toFixed(4)} MiB/s`,
  ].join("\n");
}
