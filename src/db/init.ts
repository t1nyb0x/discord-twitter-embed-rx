import { createClient } from "redis";

if (!process.env.REDIS_URL) {
  console.warn("REDIS_URL is not set, using default localhost");
}

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => console.error("Redis Client Error", err));
