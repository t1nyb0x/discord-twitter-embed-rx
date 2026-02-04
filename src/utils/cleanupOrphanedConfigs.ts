/**
 * 孤立した config のガベージコレクション
 *
 * Bot が参加していないギルドの設定を削除します。
 * デフォルトはOFFで、環境変数 ENABLE_ORPHAN_CLEANUP=true で有効化します。
 */

import type { Client } from "discord.js";
import type Redis from "ioredis";
import logger from "@/utils/logger";

const ENABLE_ORPHAN_CLEANUP = process.env.ENABLE_ORPHAN_CLEANUP === "true";

/**
 * 孤立した config をクリーンアップ
 *
 * Bot が参加していないギルドの joined/config/channels キーを削除します。
 * SCAN を使用して Redis をブロックしないように実装されています。
 *
 * @param client Discord Client
 * @param redis Redis インスタンス
 */
export async function cleanupOrphanedConfigs(client: Client, redis: Redis): Promise<void> {
  if (!ENABLE_ORPHAN_CLEANUP) {
    logger.info("[Cleanup] Orphan cleanup is disabled (set ENABLE_ORPHAN_CLEANUP=true to enable)");
    return;
  }

  const startTime = Date.now();
  const joinedGuildIds = new Set(client.guilds.cache.keys());
  let cursor = "0";
  let cleanedCount = 0;

  logger.info("[Cleanup] Starting orphan config cleanup...", {
    totalGuilds: joinedGuildIds.size,
  });

  try {
    do {
      // SCAN でキーを段階的に取得（Redis をブロックしない）
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "app:guild:*:joined", "COUNT", 100);
      cursor = nextCursor;

      for (const key of keys) {
        const guildId = key.split(":")[2]; // app:guild:{id}:joined
        if (!joinedGuildIds.has(guildId)) {
          // joined キーと関連キーを削除
          await redis.del(`app:guild:${guildId}:joined`);
          await redis.del(`app:guild:${guildId}:config`);
          await redis.del(`app:guild:${guildId}:channels`);
          cleanedCount++;

          logger.debug(`[Cleanup] Removed orphaned config for guild ${guildId}`);
        }
      }
    } while (cursor !== "0");

    const elapsed = Date.now() - startTime;
    logger.info(`[Cleanup] Orphan cleanup completed`, {
      cleanedCount,
      elapsed: `${elapsed}ms`,
      totalGuilds: joinedGuildIds.size,
    });
  } catch (err) {
    logger.error("[Cleanup] Failed to cleanup orphaned configs", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
