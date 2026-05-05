/**
 * ダッシュボードバージョン共有用の定数（Bot ↔ Dashboard 共有）
 */

/** Redis キー: ダッシュボードのバージョン情報 */
export const DASHBOARD_VERSION_KEY = "app:dashboard:version";

/** TTL（秒）: バージョン情報の有効期間 */
export const DASHBOARD_VERSION_TTL_SECONDS = 300;

/** フォールバック表示: ダッシュボード未接続時 */
export const DASHBOARD_VERSION_FALLBACK = "未接続";

/** ハートビート間隔（ミリ秒）: TTL延長の実行間隔 */
export const DASHBOARD_VERSION_HEARTBEAT_INTERVAL_MS = 120_000;

/**
 * 1メッセージあたりのURL処理数上限
 */

/** デフォルト値: 1メッセージあたりの最大処理URL数 */
export const DEFAULT_MAX_URLS_PER_MESSAGE = 3;

/** ダッシュボード設定で指定できる最大値 */
export const MAX_URLS_PER_MESSAGE_LIMIT = 5;
