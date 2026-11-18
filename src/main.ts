import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { BenchmarkDownload } from "./application/benchmark-download";
import { BenchmarkModule } from "./benchmark.module";
import { formatMetrics, parseUrl, USAGE } from "./presentation/cli";

async function main(args: readonly string[]): Promise<void> {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(USAGE);
    return;
  }

  let url: URL;
  try {
    url = parseUrl(args);
  } catch (error) {
    process.exitCode = 2;
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    return;
  }

  const app = await NestFactory.createApplicationContext(BenchmarkModule, {
    logger: false,
    abortOnError: false,
  });

  try {
    const benchmark = app.get(BenchmarkDownload);
    console.log(formatMetrics(await benchmark.run(url)));
  } finally {
    await app.close();
  }
}

void main(process.argv.slice(2)).catch((error: unknown) => {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
});
