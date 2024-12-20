import { createWriteStream } from "fs";
import * as http from "http";
import * as https from "https";

export function downloadVideo(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    client
      .get(url, (response: http.IncomingMessage) => {
        if (response.statusCode !== 200) {
          // メモリリーク防止
          response.resume();
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }

        // 書き込みストリーム作成
        const fileStream = createWriteStream(outputPath);
        // ストリームへデータをパイプする
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          console.log(`Download complete: ${outputPath}`);
          resolve();
        });
      })
      .on("error", (err: Error) => {
        reject(err);
      });
  });
}
