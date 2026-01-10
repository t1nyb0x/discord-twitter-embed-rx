import { reseedRedisFromSQLite } from "./lib/reseed";

/**
 * アプリケーション起動時の初期化処理
 */
export async function initializeApp(): Promise<void> {
  console.log("[Startup] Initializing Dashboard...");

  try {
    // Redis再シード処理を実行
    await reseedRedisFromSQLite();
    console.log("[Startup] Initialization completed");
  } catch (err) {
    console.error("[Startup] Initialization failed:", err);
    throw err;
  }
}

// Astro開発サーバー起動時に実行
if (import.meta.env.DEV) {
  initializeApp().catch((err) => {
    console.error("[Startup] Failed to initialize:", err);
    process.exit(1);
  });
}
