# Dashboard 認証・認可実装ガイド

> このドキュメントは [DASHBOARD_SPEC.md](DASHBOARD_SPEC.md) のセクション7（認証・認可・セキュリティ）から抽出した実装例を記載しています。

---

## 目次

- [Discord OAuth2 フロー](#discord-oauth2-フロー)
- [Cookie 属性](#cookie-属性)
- [CSRF 対策](#csrf-対策)
- [権限チェック](#権限チェック)
- [accessToken の暗号化](#accesstoken-の暗号化)
- [401 時のセッション破棄](#401-時のセッション破棄)
- [アクセス権検証](#アクセス権検証)
- [botJoined の判定](#botjoined-の判定)
- [lucia-auth 設定](#lucia-auth-設定)

---

## Discord OAuth2 フロー

```
1. ユーザーが /api/auth/discord/login にアクセス
2. state を生成し Redis に保存（oauth:state:{state}, TTL: 10分）
3. Discord 認可画面にリダイレクト
4. ユーザーが許可
5. /api/auth/discord/callback にコールバック
6. state を検証（Redis から取得し、一致確認後削除）
7. アクセストークンでユーザー情報 & ギルド一覧を取得
8. lucia-auth でセッション作成（Redis に保存、TTL: 7日）
9. CSRF トークン生成・保存（app:csrf:{sessionId}）
10. セッション Cookie を設定してダッシュボードへリダイレクト
```

---

## Cookie 属性

```typescript
// lucia-auth 設定
sessionCookie: {
  name: 'session',
  attributes: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS 必須
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7日
  },
}
```

---

## CSRF 対策

状態変更系 API（POST, PUT, DELETE）には CSRF トークンを必須とします。

### CSRF トークンの発行

```typescript
// ログイン成功時
const csrfToken = crypto.randomBytes(32).toString('hex');
// ★ CSRF トークンの TTL はセッションと同期（7日）
// セッション削除時に CSRF トークンも同時に削除することを保証
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7日
await redis.setex(`app:csrf:${sessionId}`, SESSION_TTL_SECONDS, csrfToken);
// トークンはレスポンスヘッダーまたは HTML に埋め込んで返す
```

### CSRF トークンのライフサイクル管理

| イベント | 対応 |
|----------|------|
| ログイン成功 | CSRF トークン生成、TTL はセッションと同じ 7日 |
| セッション更新 | CSRF トークンの TTL も延長（任意、未実装でも問題なし） |
| ログアウト | CSRF トークンを明示的に削除 |
| セッション期限切れ | TTL によりCSRF トークンも自動削除 |

```typescript
// ログアウト時の削除
await lucia.invalidateSession(sessionId);
await redis.del(`app:csrf:${sessionId}`);  // ★ 明示的に削除
```

### CSRF トークンの検証（P0対応）

```typescript
// ★ P0対応: timingSafeEqual は長さが異なると例外を投げるため、事前チェックが必須
async function validateCsrfToken(sessionId: string, token: string | undefined): Promise<boolean> {
  // 1. token が存在しない/空の場合は即座に拒否
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // 2. token の形式バリデーション（hex 64文字 = 32バイト）
  // これにより不正な形式の token を早期に拒否
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return false;
  }
  
  // 3. Redis から保存されたトークンを取得
  const storedToken = await redis.get(`app:csrf:${sessionId}`);
  if (!storedToken) {
    return false;
  }
  
  // 4. ★ P0対応: 長さが一致しない場合は false を返す（例外を投げない）
  // timingSafeEqual は長さが異なると TypeError を投げるため
  if (storedToken.length !== token.length) {
    return false;
  }
  
  // 5. タイミング攻撃を防ぐ定時間比較
  return crypto.timingSafeEqual(
    Buffer.from(storedToken, 'utf8'),
    Buffer.from(token, 'utf8')
  );
}
```

**P0対応の理由**:

`timingSafeEqual` は入力バッファの長さが異なると `TypeError` を投げます。
以下のケースで 500 エラーが発生する危険があります：

- storedToken が存在しない/壊れている
- ヘッダーの token が短い/欠けている

**対策**:
1. token の存在・型チェック
2. hex 形式のバリデーション
3. 長さチェックを timingSafeEqual の前に実行

### フロントエンドでの送信

```typescript
// Preact コンポーネント
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

await fetch(`/api/guilds/${guildId}/config`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

---

## 権限チェック

設定変更には Discord の `MANAGE_GUILD` (0x20) 権限が必要です。

```typescript
function hasManageGuildPermission(permissions: string): boolean {
  const MANAGE_GUILD = 0x20n;
  return (BigInt(permissions) & MANAGE_GUILD) === MANAGE_GUILD;
}
```

**重要**: 権限チェックは UI だけでなく、**必ず API 側でも再検証**すること。

### セッションデータの構造

```typescript
interface SessionData {
  userId: string;
  // ★ accessToken は暗号化して保存（後述の暗号化セクション参照）
  encryptedAccessToken: string;  // AEAD 暗号化済み
  expiresAt: number;    // トークン有効期限（Discordのexpires_inから計算）
}

interface CachedGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
}
```

---

## accessToken の暗号化

**重要: accessToken の保護**

accessToken が漏洩すると、そのユーザーの Discord アカウントにアクセスされるリスクがあります。
以下の対策を必ず実装してください：

1. **暗号化保存**: Redis には AEAD 暗号化したトークンのみを保存
2. **ログ出力禁止**: `JSON.stringify(session)` などでトークンをログに出さない
3. **expiresAt のソース**: Discord のレスポンスの `expires_in` を使用（推測しない）

### セキュリティ考慮事項

- `ENCRYPTION_SALT` は環境変数で指定（固定値だと鍵が環境間で同一になる）
- GCM モードの IV は **12 bytes** が標準（NIST 推奨）
- `SESSION_SECRET` を変更した場合、既存セッションはすべて無効になる（再ログインが必要）
- 鍵ローテーション時は `SESSION_SECRET` と `ENCRYPTION_SALT` の両方を変更

### 暗号化実装（P2対応）

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// ★ P2対応: salt は環境変数で必須指定（デフォルト値は禁止）
// 配布版でデフォルト値を使うと全員同じ鍵派生になりセキュリティ事故になる
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT;

// ★ P2対応: 起動時チェック - 未設定なら即座にエラーで停止
if (!ENCRYPTION_SALT || ENCRYPTION_SALT.length < 16) {
  console.error('╔════════════════════════════════════════════════════════════╗');
  console.error('║           ❌ ENCRYPTION_SALT NOT CONFIGURED ❌              ║');
  console.error('╠════════════════════════════════════════════════════════════╣');
  console.error('║ ENCRYPTION_SALT 環境変数が設定されていないか、短すぎます。 ║');
  console.error('║ 以下のコマンドで生成してください:                          ║');
  console.error('║   openssl rand -base64 32                                  ║');
  console.error('║                                                            ║');
  console.error('║ .env ファイルに追加:                                        ║');
  console.error('║   ENCRYPTION_SALT=<生成した値>                              ║');
  console.error('╚════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

// SESSION_SECRET から暗号化鍵を派生
function deriveKey(secret: string): Buffer {
  return scryptSync(secret, ENCRYPTION_SALT, 32);
}

function encryptToken(token: string, secret: string): string {
  const key = deriveKey(secret);
  // ★ GCM の IV は 12 bytes が標準（NIST SP 800-38D 推奈）
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv (12) + authTag (16) + encrypted を base64 で返す
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptToken(encryptedToken: string, secret: string): string {
  const key = deriveKey(secret);
  const data = Buffer.from(encryptedToken, 'base64');
  // ★ IV は 12 bytes
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

### 鍵ローテーション手順

`SESSION_SECRET` を変更すると既存セッションは全破棄されます。
これは意図した動作であり、鍵漏洩時の緊急対応にも有効です。

**ローテーション手順**:
1. `.env` の `SESSION_SECRET` と `ENCRYPTION_SALT` を新しい値に変更
2. Dashboard コンテナを再起動
3. 既存ユーザーは全員再ログインが必要になる

**環境変数の追加**:
```bash
# .env.example に追加
ENCRYPTION_SALT=your-unique-salt-here  # 環境ごとに異なる値を設定
```

### expiresAt の計算

```typescript
// OAuth2 コールバック時
async function handleOAuthCallback(code: string): Promise<SessionData> {
  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  
  const tokenData = await tokenResponse.json();
  
  // ★ Discord のレスポンスから expires_in を取得（推測しない）
  const expiresAt = Date.now() + (tokenData.expires_in * 1000);
  
  // トークンを暗号化して保存
  const encryptedAccessToken = encryptToken(tokenData.access_token, SESSION_SECRET);
  
  return {
    userId,
    encryptedAccessToken,
    expiresAt,
  };
}
```

---

## 401 時のセッション破棄

Discord API が 401 を返した場合は、サーバー側でセッションを破棄し、クライアントに再ログインを強制します。

```typescript
async function fetchUserGuildsWithSessionCleanup(
  sessionId: string,
  sessionData: SessionData
): Promise<CachedGuild[]> {
  const accessToken = decryptToken(sessionData.encryptedAccessToken, SESSION_SECRET);
  
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (response.status === 401) {
    // ★ トークン期限切れ: セッションを破棄
    await lucia.invalidateSession(sessionId);
    await redis.del(`app:csrf:${sessionId}`);
    await redis.del(`app:user:${sessionData.userId}:guilds`);
    throw new UnauthorizedError('セッションが切れました。再ログインしてください。');
  }
  
  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status}`);
  }
  
  return response.json();
}
```

### P0対応: 配布版での UX 考慮（再ログイン導線は必須）

refresh_token を使わない場合、放置していると急に再ログイン要求が頻発する可能性があります。
配布版として UX が荒れるのを避けるため、以下の対策を **P0（必須）** とします：

#### 1. UI に「期限切れ→再ログイン」を明確に表示（P0 必須）

401 時は「セッションが切れました」と明確に表示し、**再ログインボタンを目立たせる**。
エラー時にユーザーが「何をすればいいか」を即座に理解できる UI にします。

```tsx
// 401 エラー時の UI 例（P0 必須）
function SessionExpiredBanner() {
  return (
    <div className="error-banner session-expired">
      <p>セッションが切れました。再ログインが必要です。</p>
      <a href="/api/auth/discord/login" className="btn btn-primary">
        Discord でログイン
      </a>
    </div>
  );
}
```

#### 2. 401 時のセッションクリアは関連キャッシュも同時削除（P0 必須）

```typescript
// 401 時はギルド一覧キャッシュも削除することを漏らさない
await lucia.invalidateSession(sessionId);
await redis.del(`app:csrf:${sessionId}`);
await redis.del(`app:user:${sessionData.userId}:guilds`); // ★ 必須
```

#### 3. P1対応: セッション有効期限の表示と期限切れ警告（MUST）

ログイン後のダッシュボードに「セッション有効期限: ○日後」のように表示します。
**期限が残り 24時間を切った場合は警告を表示（MUST）**。

```tsx
// セッション期限警告 UI（MUST）
function SessionExpiryWarning({ expiresAt }: { expiresAt: number }) {
  const now = Date.now();
  const remaining = expiresAt - now;
  const remainingHours = Math.floor(remaining / (1000 * 60 * 60));
  const remainingDays = Math.floor(remaining / (1000 * 60 * 60 * 24));
  
  // 24時間以内なら警告
  if (remaining < 24 * 60 * 60 * 1000 && remaining > 0) {
    return (
      <div className="warning-banner session-expiry">
        <p>⚠️ セッションの有効期限が {remainingHours} 時間後に切れます。</p>
        <a href="/api/auth/discord/login" className="btn btn-secondary">
          今すぐ再ログイン
        </a>
      </div>
    );
  }
  
  // 7日以内なら表示（情報提供）
  if (remaining > 0) {
    return (
      <p className="session-info">
        セッション有効期限: {remainingDays} 日後
      </p>
    );
  }
  
  return null;
}
```

---

## アクセス権検証

### エラーコード設計

| 状況 | HTTP | コード | 理由 |
|------|------|--------|------|
| 未ログイン / セッション切れ | 401 | `UNAUTHORIZED` | 認証が必要 |
| ギルドが見つからない / 権限なし | 403 | `FORBIDDEN` | アクセス権限がない |
| Bot 未参加 | 404 | `NOT_FOUND` | リソースが存在しない（Bot がいない = 設定対象がない） |

### アクセス権検証実装

```typescript
// API ハンドラ内
// ★ guilds は SessionData に含めず、Redis の app:user:{userId}:guilds から取得する
// ★ P1対応: forceRefresh オプションで設定保存時などの重要操作時に Discord API で再検証
async function validateGuildAccess(
  guildId: string, 
  sessionData: SessionData,
  options: { forceRefresh?: boolean } = {}
): Promise<void> {
  // 1. Redis からギルド一覧キャッシュを取得
  const guildsJson = await redis.get(`app:user:${sessionData.userId}:guilds`);
  let guilds: CachedGuild[] = guildsJson ? JSON.parse(guildsJson) : [];
  let guild = guilds.find(g => g.id === guildId);
  
  // 2. キャッシュにない、または forceRefresh が指定された場合は Discord API で再取得
  const shouldRefresh = !guild || options.forceRefresh;
  if (shouldRefresh && sessionData.expiresAt > Date.now()) {
    const accessToken = decryptToken(sessionData.encryptedAccessToken, SESSION_SECRET);
    const freshGuilds = await fetchUserGuilds(accessToken);
    // Redis キャッシュを更新
    await updateSessionGuilds(sessionData.userId, freshGuilds);
    guild = freshGuilds.find(g => g.id === guildId);
  }
  
  // 3. ギルドが見つからない場合（ユーザーがそのギルドに所属していない）
  if (!guild) {
    throw new ForbiddenError('ギルドにアクセスする権限がありません'); // 403
  }
  
  // 4. MANAGE_GUILD 権限チェック
  if (!hasManageGuildPermission(guild.permissions)) {
    throw new ForbiddenError('MANAGE_GUILD 権限が必要です'); // 403
  }
  
  // 5. Bot が参加しているか Redis で確認
  const joined = await redis.exists(`app:guild:${guildId}:joined`);
  if (!joined) {
    throw new NotFoundError('Bot がこのギルドに参加していません'); // 404
  }
}
```

**P1対応**: PUT（設定保存）時は forceRefresh を true にして権限を再検証します。
これにより、権限が剥奪されたユーザーが古いキャッシュで設定変更することを防止します。

```typescript
// PUT /api/guilds/{guildId}/config ハンドラ内:
await validateGuildAccess(guildId, sessionData, { forceRefresh: true });
```

### Discord API からギルド一覧を取得

```typescript
// Discord API からギルド一覧を取得
async function fetchUserGuilds(accessToken: string): Promise<CachedGuild[]> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    // トークン期限切れなど
    throw new UnauthorizedError('再ログインが必要です');
  }
  
  return response.json();
}
```

### セッションのギルドキャッシュを更新

Note: lucia-auth のセッションキーは sessionId 単位ですが、
guilds キャッシュは userId 単位で保存します（1ユーザー複数セッションでも共有）。

```typescript
// セッションのギルドキャッシュを更新
async function updateSessionGuilds(userId: string, guilds: CachedGuild[]): Promise<void> {
  // ★ app: prefix を付ける（アプリケーション管轄）
  // ★ P1対応: TTL を 7日から 1時間に短縮（権限変更への追従を早める）
  const sessionKey = `app:user:${userId}:guilds`;
  await redis.setex(sessionKey, 60 * 60, JSON.stringify(guilds)); // 1時間
}
```

### トークン期限切れの扱い

- Discord のアクセストークンは通常 7 日間有効（環境により変動あり）
- 期限切れ時は `fetchUserGuilds` が 401 を返す
- UI で「セッションが切れました。再ログインしてください」と表示
- refresh_token は使わない（実装複雑化を避ける）

**運用上の注意**:
- トークン期限は Discord が制御するため、環境によって異なる可能性があります
- 期限切れは「起こるもの」として設計し、再ログインで復旧する前提
- SLO としては「トークン期限切れ時、再ログインにより即復旧」を保証

---

## botJoined の判定

**設計方針**: Dashboard は Bot トークンを持たない（配布時のセキュリティリスク軽減）

### 判定方法

1. Bot がギルドに参加すると、`guildCreate` イベントで Redis に `app:guild:{guildId}:joined` キーを作成（TTL なし）
2. Bot がギルドから離脱すると、`guildDelete` イベントでキーを削除
3. Dashboard は Redis の `app:guild:{guildId}:joined` キーの存在で `botJoined` を判定

```typescript
// Dashboard 側（API ハンドラ）
async function isBotJoined(guildId: string): Promise<boolean> {
  const exists = await redis.exists(`app:guild:${guildId}:joined`);
  return exists === 1;
}
```

Bot 側の実装は [DASHBOARD_BOT_IMPLEMENTATION.md](DASHBOARD_BOT_IMPLEMENTATION.md) を参照してください。

---

## lucia-auth 設定

```typescript
// dashboard/src/lib/auth.ts

import { Lucia } from 'lucia';
import { RedisAdapter } from '@lucia-auth/adapter-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// lucia-auth 管轄のキーは lucia: prefix を使用
// これにより app: prefix と明確に分離される
const adapter = new RedisAdapter(redis, {
  session: 'lucia:session',
  user: 'lucia:user',
});

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: 'session',
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  sessionExpiresIn: new TimeSpan(7, 'd'),
  getUserAttributes: (attributes) => ({
    discordId: attributes.discord_id,
    username: attributes.username,
    avatar: attributes.avatar,
  }),
});
```

---

## 関連ドキュメント

- [DASHBOARD_SPEC.md](DASHBOARD_SPEC.md) - メイン仕様書
- [DASHBOARD_API_IMPLEMENTATION.md](DASHBOARD_API_IMPLEMENTATION.md) - API 実装ガイド
- [DASHBOARD_BOT_IMPLEMENTATION.md](DASHBOARD_BOT_IMPLEMENTATION.md) - Bot 側実装
- [DASHBOARD_DEPLOYMENT.md](DASHBOARD_DEPLOYMENT.md) - デプロイ・運用ガイド
