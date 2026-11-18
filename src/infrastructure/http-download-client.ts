import { get as httpGet, type IncomingMessage } from "node:http";
import { get as httpsGet } from "node:https";
import type { DownloadClient } from "../application/download-client.port";

export class HttpDownloadClient implements DownloadClient {
  constructor(private readonly requestTimeoutMs: number) {}

  async download(url: URL): Promise<number> {
    const signal = AbortSignal.timeout(this.requestTimeoutMs);

    try {
      const response = await this.getResponse(url, signal);
      const status = response.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        response.destroy();
        throw new Error(`сервер вернул HTTP ${status}`);
      }

      let bytes = 0;
      const chunks: AsyncIterable<Buffer> = response;
      for await (const chunk of chunks) {
        bytes += chunk.length;
      }
      if (!response.complete) {
        throw new Error("соединение закрыто до получения полного ответа");
      }

      return bytes;
    } catch (cause) {
      if (signal.aborted) {
        throw new Error(`превышен тайм-аут ${this.requestTimeoutMs} мс`, {
          cause,
        });
      }
      throw cause;
    }
  }

  private getResponse(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
    const get = url.protocol === "https:" ? httpsGet : httpGet;

    return new Promise((resolve, reject) => {
      const request = get(
        url,
        { signal, headers: { "Accept-Encoding": "identity" } },
        resolve,
      );
      request.once("error", reject);
      request.once("upgrade", (response, socket) => {
        socket.destroy();
        reject(new Error(`сервер вернул HTTP ${response.statusCode}`));
      });
    });
  }
}
