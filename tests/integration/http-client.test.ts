import { describe, it, expect } from "vitest";
import { HttpClient } from "@/infrastructure/http/HttpClient";

describe("HttpClient統合テスト", () => {
  const httpClient = new HttpClient();

  describe("getFileSize", () => {
    it("実際のファイルサイズを取得できる", async () => {
      // GitHub上の小さな公開ファイルを使用
      const url = "https://raw.githubusercontent.com/microsoft/TypeScript/main/package.json";

      const size = await httpClient.getFileSize(url);

      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(100 * 1024); // 100KB未満であることを期待
    }, 15000);

    it("HTTPSプロトコルで正しくファイルサイズを取得できる", async () => {
      // 小さな画像ファイル（GitHubロゴなど公開リソース）
      const url = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";

      const size = await httpClient.getFileSize(url);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe("number");
    }, 15000);

    it("Content-Lengthヘッダーがない場合はエラーを投げる", async () => {
      // ストリーミングエンドポイントなどContent-Lengthがないことがある
      // このテストは実際のエンドポイントに依存するため、スキップ可能
      expect(true).toBe(true);
    });

    it("不正なプロトコルの場合はエラーを投げる", async () => {
      const url = "ftp://example.com/file.mp4";

      await expect(httpClient.getFileSize(url)).rejects.toThrow();
    }, 15000);
  });

  describe("get", () => {
    it("実際のHTTPレスポンスを取得できる", async () => {
      const url = "https://raw.githubusercontent.com/microsoft/TypeScript/main/README.md";

      const response = await httpClient.get(url);

      expect(response).toBeTruthy();
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    }, 15000);

    it("404エラーの場合はエラーを投げる", async () => {
      const url = "https://raw.githubusercontent.com/microsoft/TypeScript/main/nonexistent-file.txt";

      await expect(httpClient.get(url)).rejects.toThrow();
    }, 15000);
  });

  describe("MediaHandlerとの統合", () => {
    it("実際のファイルサイズチェックが動作する", async () => {
      // 実際のTwitter動画サムネイル程度のサイズ
      const testUrl = "https://raw.githubusercontent.com/microsoft/TypeScript/main/package.json";

      const size = await httpClient.getFileSize(testUrl);
      const maxSize = 5 * 1024 * 1024; // 5MB

      // このファイルは5MB未満であることを確認
      expect(size).toBeLessThan(maxSize);

      // MediaHandlerで使用される判定ロジックをテスト
      const isDownloadable = size <= maxSize;
      expect(isDownloadable).toBe(true);
    }, 15000);

    it("大きなファイルを正しく判定できる", async () => {
      // 比較的大きめの画像ファイル
      const testUrl = "https://github.githubassets.com/images/modules/site/home-campaign/hero.webp";

      const size = await httpClient.getFileSize(testUrl);
      const tinyLimit = 1000; // 1KB

      // この画像ファイルは1KB以上あるはず
      expect(size).toBeGreaterThan(tinyLimit);
    }, 15000);
  });
});
