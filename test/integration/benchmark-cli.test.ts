import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer, type RequestListener } from "node:http";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { HttpDownloadClient } from "../../src/infrastructure/http-download-client";

const execFileAsync = promisify(execFile);
const cli = resolve("dist/main.js");
const resources: Array<() => Promise<void>> = [];

async function startServer(handler: RequestListener): Promise<string> {
  const server = createServer(handler).listen(0, "127.0.0.1");
  await once(server, "listening");
  resources.push(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  );

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP address");
  }
  return `http://127.0.0.1:${address.port}`;
}

function runCli(url: string) {
  return execFileAsync(process.execPath, [cli, url], { timeout: 5_000 });
}

afterEach(async () => {
  await Promise.all(resources.splice(0).map((close) => close()));
});

describe("download benchmark CLI", () => {
  it("reads ten complete chunked bodies sequentially", async () => {
    const chunk = Buffer.alloc(256 * 1024, 0xff);
    const requests: string[] = [];
    let active = 0;
    let maxActive = 0;
    const url = await startServer(async (request, response) => {
      requests.push(`${request.method} ${request.url}`);
      active += 1;
      maxActive = Math.max(maxActive, active);

      response.write(chunk);
      await delay(15);
      active -= 1;
      response.end(chunk);
    });

    const { stdout, stderr } = await runCli(`${url}/payload?v=1`);

    expect(requests).toEqual(
      Array.from({ length: 10 }, () => "GET /payload?v=1"),
    );
    expect(maxActive).toBe(1);
    expect(stderr).toBe("");
    expect(stdout).toContain("Запросов: 10");
    expect(stdout).toContain("Общий объём: 5242880 байт");
    expect(stdout).toMatch(/Среднее время запроса: \d+\.\d{2} мс/);
    expect(stdout).toMatch(/Скорость скачивания: \d+\.\d{4} MiB\/s/);
  });

  it("accepts empty responses and reports zero bytes and throughput", async () => {
    const url = await startServer((_request, response) => {
      response.writeHead(204).end();
    });

    const { stdout } = await runCli(url);
    expect(stdout).toContain("Запросов: 10");
    expect(stdout).toContain("Общий объём: 0 байт");
    expect(stdout).toContain("Скорость скачивания: 0.0000 MiB/s");
  });

  it("rejects invalid input with a usage error", async () => {
    await expect(runCli("ftp://example.com/file")).rejects.toMatchObject({
      code: 2,
      stdout: "",
      stderr: expect.stringContaining("Укажите корректный URL"),
    });
  });

  it("stops on an HTTP error and reports its position", async () => {
    let requests = 0;
    const url = await startServer((_request, response) => {
      requests += 1;
      response.writeHead(requests === 3 ? 503 : 200).end("body");
    });

    await expect(runCli(url)).rejects.toMatchObject({
      code: 1,
      stdout: "",
      stderr: expect.stringContaining("Запрос 3/10: сервер вернул HTTP 503"),
    });
    expect(requests).toBe(3);
  });

  it("fails when a response ends before its declared size", async () => {
    let requests = 0;
    const url = await startServer((_request, response) => {
      requests += 1;
      response.writeHead(200, { "Content-Length": 64, Connection: "close" });
      response.end("partial body");
    });

    await expect(runCli(url)).rejects.toMatchObject({
      code: 1,
      stdout: "",
      stderr: expect.stringContaining("Запрос 1/10"),
    });
    expect(requests).toBe(1);
  });

  it("applies the timeout while the response body is still streaming", async () => {
    let bodyStarted = false;
    const url = await startServer((_request, response) => {
      response.write("first chunk");
      bodyStarted = true;
    });

    const client = new HttpDownloadClient(250);
    await expect(client.download(new URL(url))).rejects.toThrow(
      "превышен тайм-аут 250 мс",
    );
    expect(bodyStarted).toBe(true);
  });
});
