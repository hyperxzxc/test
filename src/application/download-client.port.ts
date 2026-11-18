export const DOWNLOAD_CLIENT = Symbol("DownloadClient");

export interface DownloadClient {
  download(url: URL): Promise<number>;
}
