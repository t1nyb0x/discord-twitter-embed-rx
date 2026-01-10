import { randomBytes, timingSafeEqual } from "crypto";
import { redis } from "./redis";

/**
 * CSRFトークンを生成してRedisに保存
 * TTLはセッションと同じ7日間
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const key = `app:csrf:${sessionId}`;

  // セッションと同じTTL（7日間 = 604800秒）
  await redis.setex(key, 60 * 60 * 24 * 7, token);

  return token;
}

/**
 * CSRFトークンを検証
 * P0対応: 長さチェック・hex形式バリデーションを timingSafeEqual の前に実行
 */
export async function verifyCsrfToken(sessionId: string, token: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  // ★ P0対応: 長さチェック（64文字 = 32バイトのhex）
  if (token.length !== 64) {
    return false;
  }

  // ★ P0対応: hex形式のバリデーション
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    return false;
  }

  const key = `app:csrf:${sessionId}`;
  const storedToken = await redis.get(key);

  if (!storedToken) {
    return false;
  }

  // ★ P0対応: 長さが一致することを確認してから timingSafeEqual を使用
  if (storedToken.length !== token.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(storedToken), Buffer.from(token));
  } catch {
    return false;
  }
}

/**
 * CSRFトークンを削除（ログアウト時）
 */
export async function deleteCsrfToken(sessionId: string): Promise<void> {
  const key = `app:csrf:${sessionId}`;
  await redis.del(key);
}
