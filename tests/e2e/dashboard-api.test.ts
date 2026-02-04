/**
 * E2E テスト: Dashboard API
 *
 * NOTE: このテストは Dashboard が起動している状態で実行する必要があります。
 * Docker Compose 環境での実行を想定しています。
 */

import { describe, it, expect } from "vitest";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:4321";

describe("E2E: Dashboard API", () => {
  describe("ヘルスチェック", () => {
    it.skip("Dashboard が起動している", async () => {
      // NOTE: ヘルスチェックエンドポイントがあれば使用
      const response = await fetch(`${DASHBOARD_URL}/api/health`);
      expect(response.status).toBe(200);
    });
  });

  describe("認証が必要なエンドポイント", () => {
    it("認証なしでギルド一覧を取得すると 401 が返る", async () => {
      const response = await fetch(`${DASHBOARD_URL}/api/guilds`);
      expect(response.status).toBe(401);
    });

    it("認証なしでギルド設定を取得すると 401 が返る", async () => {
      const testGuildId = "123456789012345678";
      const response = await fetch(`${DASHBOARD_URL}/api/guilds/${testGuildId}/config`);
      expect(response.status).toBe(401);
    });

    it.skip("認証なしで監査ログを取得すると 401 が返る", async () => {
      // NOTE: Dashboard が起動していない場合はスキップ
      const testGuildId = "123456789012345678";
      const response = await fetch(`${DASHBOARD_URL}/api/guilds/${testGuildId}/audit-logs`);
      expect(response.status).toBe(401);
    });
  });

  // 認証付きのテストは、テストユーザーのセッションを作成する必要があるため、
  // より高度なセットアップが必要です。以下はスキップとして定義しています。

  describe.skip("認証付きテスト（要セットアップ）", () => {
    let sessionCookie: string;

    it("OAuth ログインができる", async () => {
      // TODO: テスト用のOAuth認証フローを実装
      // NOTE: モックDiscord APIサーバーを使用するか、テスト用のトークンを用意する必要があります
    });

    it("ギルド一覧を取得できる", async () => {
      // TODO: セッションCookieを使ってリクエスト
    });

    it("ギルド設定を取得できる", async () => {
      // TODO: セッションCookieを使ってリクエスト
    });

    it("ギルド設定を保存できる", async () => {
      // TODO: CSRF トークンとセッションCookieを使ってリクエスト
    });
  });
});

/**
 * E2E テストの実行方法
 *
 * 1. Dashboard と Bot、Redis を起動:
 *    $ docker compose up -d
 *
 * 2. E2E テストを実行:
 *    $ npm run test:e2e
 *
 * 3. 環境変数でエンドポイントを指定:
 *    $ DASHBOARD_URL=http://localhost:4321 npm run test:e2e
 */
