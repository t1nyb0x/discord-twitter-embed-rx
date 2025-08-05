import { redis } from "./init";

export async function connectRedis() {
  try {
    await redis.connect();
    if (redis.isReady) {
      console.log("Redis client connected");
    } else {
      throw new Error("Redis client is not ready after connection attempt");
    }
  } catch (err) {
    console.error("Redis connection failed:", err);
    throw err;
  }
}
