import https from "node:https";
import { IFileSizeChecker } from "@/core/services/MediaHandler";
import logger from "@/utils/logger";

/**
 * HTTPリクエストを担当
 */
export class HttpClient implements IFileSizeChecker {
  /**
   * URLのファイルサイズを取得
   * @param url 対象URL
   * @returns ファイルサイズ（バイト）
   */
  async getFileSize(url: string): Promise<number> {
    const startTime = Date.now();
    logger.debug("HTTP HEAD request started", { url });

    return new Promise((resolve, reject) => {
      const req = https.request(url, { method: "HEAD" }, (res) => {
        const duration = Date.now() - startTime;
        const contentLength = res.headers["content-length"];

        if (contentLength) {
          const size = parseInt(contentLength, 10);
          logger.debug("HTTP HEAD request completed", {
            url,
            statusCode: res.statusCode,
            contentLength: size,
            duration: `${duration}ms`,
          });
          resolve(size);
        } else {
          logger.warn("HTTP HEAD request missing Content-Length header", {
            url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
          });
          reject(new Error("Could not get Content-Length Header..."));
        }
      });

      req.on("error", (err) => {
        const duration = Date.now() - startTime;
        logger.error("HTTP HEAD request failed", { url, error: err.message, duration: `${duration}ms` });
        reject(err);
      });
      req.end();
    });
  }

  /**
   * GETリクエストを実行
   * @param url リクエストURL
   * @returns レスポンスボディ
   */
  async get(url: string): Promise<string> {
    const startTime = Date.now();
    logger.debug("HTTP GET request started", { url });

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            const duration = Date.now() - startTime;
            if (res.statusCode === 200) {
              logger.debug("HTTP GET request completed", {
                url,
                statusCode: res.statusCode,
                responseSize: data.length,
                duration: `${duration}ms`,
              });
              resolve(data);
            } else {
              logger.error("HTTP GET request failed", { url, statusCode: res.statusCode, duration: `${duration}ms` });
              reject(new Error(`Request failed with status ${res.statusCode}`));
            }
          });
        })
        .on("error", (err) => {
          const duration = Date.now() - startTime;
          logger.error("HTTP GET request error", { url, error: err.message, duration: `${duration}ms` });
          reject(err);
        });
    });
  }
}
