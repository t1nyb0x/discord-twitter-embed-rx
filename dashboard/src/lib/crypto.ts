import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";

// ★ P0対応: ENCRYPTION_SALT は環境変数で必須指定
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT;
const SESSION_SECRET = process.env.SESSION_SECRET || "";

// ★ P0対応: 起動時チェック - 未設定なら即座にエラーで停止
if (!ENCRYPTION_SALT || ENCRYPTION_SALT.length < 16) {
  console.error("╔════════════════════════════════════════════════════════════╗");
  console.error("║           ❌ ENCRYPTION_SALT NOT CONFIGURED ❌              ║");
  console.error("╠════════════════════════════════════════════════════════════╣");
  console.error("║ ENCRYPTION_SALT 環境変数が設定されていないか、短すぎます。 ║");
  console.error("║ 以下のコマンドで生成してください:                          ║");
  console.error("║   openssl rand -base64 32                                  ║");
  console.error("║                                                            ║");
  console.error("║ .env ファイルに追加:                                        ║");
  console.error("║   ENCRYPTION_SALT=<生成した値>                              ║");
  console.error("╚════════════════════════════════════════════════════════════╝");
  process.exit(1);
}

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error("╔════════════════════════════════════════════════════════════╗");
  console.error("║           ❌ SESSION_SECRET NOT CONFIGURED ❌               ║");
  console.error("╠════════════════════════════════════════════════════════════╣");
  console.error("║ SESSION_SECRET 環境変数が設定されていないか、短すぎます。  ║");
  console.error("║ 以下のコマンドで生成してください:                          ║");
  console.error("║   openssl rand -base64 32                                  ║");
  console.error("╚════════════════════════════════════════════════════════════╝");
  process.exit(1);
}

// SESSION_SECRET から暗号化鍵を派生
function deriveKey(secret: string): Buffer {
  return scryptSync(secret, ENCRYPTION_SALT, 32);
}

export function encryptToken(token: string, secret: string = SESSION_SECRET): string {
  const key = deriveKey(secret);
  // ★ GCM の IV は 12 bytes が標準（NIST SP 800-38D 推奨）
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv (12) + authTag (16) + encrypted を base64 で返す
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(encryptedToken: string, secret: string = SESSION_SECRET): string {
  const key = deriveKey(secret);
  const data = Buffer.from(encryptedToken, "base64");
  // ★ IV は 12 bytes
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
