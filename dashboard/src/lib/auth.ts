import { RedisAdapter } from "@lucia-auth/adapter-session-redis";
import { Lucia } from "lucia";
import { redis } from "./redis";

// Redisアダプター（セッション管理）
const adapter = new RedisAdapter(redis, {
  // lucia: prefix を使用
  sessionPrefix: "lucia:session:",
  userSessionsPrefix: "lucia:user_sessions:",
});

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  getUserAttributes: (attributes) => ({
    discordId: attributes.discord_id,
    username: attributes.username,
    avatar: attributes.avatar,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  discord_id: string;
  username: string;
  avatar: string | null;
}
