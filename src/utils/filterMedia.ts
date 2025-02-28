import https from "https";
import config from "../config/config";

export class FilterMedia {
  /**
   * URLのファイルサイズを返す
   * @param url
   * @returns number ファイルサイズ
   */
  private getFileSize(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method: "HEAD" }, (res) => {
        const contentLength = res.headers["content-length"];

        if (contentLength) {
          resolve(parseInt(contentLength, 10));
        } else {
          reject(new Error("Could not get Content-Length Header... "));
        }
      });

      req.on("error", reject);
      req.end();
    });
  }

  /**
   * MEDIA_MAX_FILE_SIZEで指定したサイズより小さいものと大きいもので分ける
   * @param mediaUrls
   * @returns {validUrls: string[]; invalidUrls: string[]} validUrls - MEDIA_MAX_FILE_SIZEより小さいデータURL配列 invalidUrls - MEDIA_MAX_FILE_SIZEより大きなデータURL配列
   */
  async mediaSizeFilter(mediaUrls: string[]): Promise<{ validUrls: string[]; invalidUrls: string[] }> {
    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    await Promise.all(
      mediaUrls.map(async (url) => {
        try {
          const fileSize = await this.getFileSize(url);
          if (fileSize <= config.MEDIA_MAX_FILE_SIZE) {
            validUrls.push(url);
          } else {
            invalidUrls.push(url);
          }
        } catch (error) {
          console.error(new Error(`Error checking file size ${error}`));
          invalidUrls.push(url);
        }
      })
    );
    return { validUrls: validUrls, invalidUrls: invalidUrls };
  }
}
