import { eq } from "drizzle-orm";
import { db } from "./db";
import { guildConfigs, channelWhitelist } from "./db/schema";
import { redis } from "./redis";

/**
 * P0対応: SQLiteからRedisへの再シード処理
 * Dashboard起動時に実行される
 */
export async function reseedRedisFromSQLite(): Promise<void> {
  console.log("[Reseed] Starting SQLite→Redis reseed...");

  try {
    // Redis の config キーが存在するか確認
    const configKeys = await redis.keys("app:guild:*:config");

    if (configKeys.length > 0) {
      console.log(`[Reseed] Found ${configKeys.length} existing config keys, skipping reseed`);
      return;
    }

    // SQLiteから全ギルド設定を取得
    const configs = await db.select().from(guildConfigs);

    if (configs.length === 0) {
      console.log("[Reseed] No configs found in SQLite");
      return;
    }

    let reseedCount = 0;

    for (const config of configs) {
      // whitelistを取得
      const whitelist = await db.select().from(channelWhitelist).where(eq(channelWhitelist.guildId, config.guildId));

      const configData = {
        guildId: config.guildId,
        allowAllChannels: config.allowAllChannels,
        whitelist: whitelist.map((w) => w.channelId),
        version: config.version,
        updatedAt: config.updatedAt,
      };

      // Redisに保存（TTLなし = 永続）
      const key = `app:guild:${config.guildId}:config`;
      await redis.set(key, JSON.stringify(configData));

      reseedCount++;
    }

    console.log(`[Reseed] Successfully reseeded ${reseedCount} configs to Redis`);
  } catch (err) {
    console.error("[Reseed] Error during reseed:", err);
    throw err;
  }
}
