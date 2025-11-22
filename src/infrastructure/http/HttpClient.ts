import https from "node:https";
import { IFileSizeChecker } from "@/core/services/MediaHandler";

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
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method: "HEAD" }, (res) => {
        const contentLength = res.headers["content-length"];

        if (contentLength) {
          resolve(parseInt(contentLength, 10));
        } else {
          reject(new Error("Could not get Content-Length Header..."));
        }
      });

      req.on("error", reject);
      req.end();
    });
  }

  /**
   * GETリクエストを実行
   * @param url リクエストURL
   * @returns レスポンスボディ
   */
  async get(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(new Error(`Request failed with status ${res.statusCode}`));
            }
          });
        })
        .on("error", reject);
    });
  }
}
