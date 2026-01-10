import { randomBytes } from "crypto";
import type { APIRoute } from "astro";
import { createRateLimitError } from "@/lib/api-helpers";
import { getDiscordAuthUrl } from "@/lib/discord";
import { checkRateLimit } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

export const GET: APIRoute = async ({ clientAddress }) => {
  // レート制限チェック（30回/分）
  const { allowed, resetAt } = await checkRateLimit(`login:${clientAddress}`, 60, 30);

  if (!allowed) {
    return createRateLimitError(resetAt);
  }

  // stateトークンを生成（CSRF対策）
  const state = randomBytes(32).toString("hex");

  // stateをRedisに保存（5分間有効）
  await redis.setex(`oauth:state:${state}`, 300, "1");

  // Discord OAuth2 URLにリダイレクト
  const authUrl = getDiscordAuthUrl(state);

  return Response.redirect(authUrl, 302);
};
