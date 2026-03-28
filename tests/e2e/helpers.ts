/**
 * E2E テスト用のヘルパー関数とセットアップ
 */

import Redis from "redis";
import type { RedisClientType } from "redis";

/**
 * E2E テスト用の Redis クライアント
 */
let testRedis: RedisClientType | null = null;

/**
 * テスト用 Redis クライアントの取得
 */
export async function getTestRedis(): Promise<RedisClientType> {
  if (!testRedis) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    testRedis = Redis.createClient({ url: redisUrl });

    try {
      await testRedis.connect();
    } catch (err) {
      console.error("[E2E] Failed to connect to Redis:", err instanceof Error ? err.message : String(err));
      console.error("[E2E] Please start Redis before running E2E tests:");
      console.error("[E2E]   docker run -d -p 6379:6379 redis:7-alpine");
      throw err;
    }
  }
  return testRedis;
}

/**
 * テスト用 Redis クライアントのクローズ
 */
export async function closeTestRedis(): Promise<void> {
  if (testRedis) {
    await testRedis.quit();
    testRedis = null;
  }
}

/**
 * テスト用の Redis データをクリア
 */
export async function cleanupTestData(guildId: string): Promise<void> {
  const redis = await getTestRedis();
  await redis.del(`app:guild:${guildId}:joined`);
  await redis.del(`app:guild:${guildId}:config`);
  await redis.del(`app:guild:${guildId}:channels`);
}

/**
 * テスト用のギルド設定をセットアップ
 */
export async function setupTestGuildConfig(
  guildId: string,
  config: {
    allowAllChannels: boolean;
    whitelist: string[];
    version: number;
  }
): Promise<void> {
  const redis = await getTestRedis();

  // joined フラグを設定
  await redis.set(`app:guild:${guildId}:joined`, "1");

  // config を設定（whitelistedChannelIds に変換）
  const redisConfig = {
    allowAllChannels: config.allowAllChannels,
    whitelistedChannelIds: config.whitelist,
    version: config.version,
  };
  await redis.set(`app:guild:${guildId}:config`, JSON.stringify(redisConfig));

  // テスト用のチャンネルリスト
  const testChannels = [
    { id: "1234567890", name: "general" },
    { id: "0987654321", name: "test-channel" },
  ];
  await redis.setEx(`app:guild:${guildId}:channels`, 3600, JSON.stringify(testChannels));
}

/**
 * テスト用のランダムなギルドIDを生成
 */
export function generateTestGuildId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Redis の値を取得（デバッグ用）
 */
export async function getRedisValue(key: string): Promise<string | null> {
  const redis = await getTestRedis();
  return await redis.get(key);
}
