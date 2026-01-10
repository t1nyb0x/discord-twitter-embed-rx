import { redis } from "./redis";

/**
 * レート制限チェック（Luaスクリプトで原子化）
 * P0対応: ZREMRANGEBYSCORE → ZCARD → ZADD を原子的に実行
 */

const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- 古いエントリを削除
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

-- 現在のリクエスト数を取得
local count = redis.call('ZCARD', key)

if count >= limit then
  -- 最古のエントリのタイムスタンプを取得してresetAtを計算
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  if #oldest >= 2 then
    local resetAt = tonumber(oldest[2]) + window
    return {0, resetAt}
  else
    -- エントリがない場合（通常ありえない）
    return {0, now + window}
  end
end

-- リクエストを追加
redis.call('ZADD', key, now, now)
redis.call('EXPIRE', key, window)

-- 最古のエントリ + window でresetAtを計算
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetAt = now + window
if #oldest >= 2 then
  resetAt = tonumber(oldest[2]) + window
end

return {1, resetAt}
`;

interface RateLimitResult {
  allowed: boolean;
  resetAt: number;
}

export async function checkRateLimit(
  identifier: string,
  windowSeconds: number,
  limit: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    const result = (await redis.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      key,
      now.toString(),
      windowSeconds.toString(),
      limit.toString()
    )) as [number, number];

    return {
      allowed: result[0] === 1,
      resetAt: result[1],
    };
  } catch (err) {
    console.error("[RateLimit] Error:", err);
    // Redisエラー時は許可する（可用性優先）
    return {
      allowed: true,
      resetAt: now + windowSeconds,
    };
  }
}
