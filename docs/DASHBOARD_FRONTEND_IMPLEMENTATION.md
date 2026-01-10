# Dashboard フロントエンド実装ガイド

> このドキュメントは [DASHBOARD_SPEC.md](DASHBOARD_SPEC.md) のセクション8（フロントエンド設計）から抽出した実装例を記載しています。

---

## 目次

- [ディレクトリ構成](#ディレクトリ構成)
- [ページ一覧](#ページ一覧)
- [UI コンポーネント](#ui-コンポーネント)
  - [ChannelSelector (Preact Island)](#channelselector-preact-island)
  - [セッション期限警告](#セッション期限警告)
  - [エラー表示](#エラー表示)

---

## ディレクトリ構成

```
dashboard/
├── astro.config.mjs
├── package.json
├── src/
│   ├── pages/
│   │   ├── index.astro              # ランディングページ
│   │   ├── login.astro              # ログインページ
│   │   ├── dashboard/
│   │   │   ├── index.astro          # ギルド一覧
│   │   │   └── [guildId].astro      # ギルド設定ページ
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── discord/
│   │       │   │   ├── login.ts
│   │       │   │   └── callback.ts
│   │       │   └── logout.ts
│   │       └── guilds/
│   │           ├── index.ts
│   │           └── [guildId]/
│   │               └── config.ts
│   ├── components/
│   │   ├── Header.astro             # 共通ヘッダー
│   │   ├── GuildCard.astro          # ギルドカード（静的）
│   │   ├── ChannelSelector.tsx      # チャンネル選択 UI (Preact Island)
│   │   ├── SessionExpiryWarning.tsx # セッション期限警告 (Preact Island)
│   │   └── ErrorBanner.tsx          # エラーバナー (Preact Island)
│   ├── layouts/
│   │   └── Layout.astro             # 共通レイアウト
│   ├── lib/
│   │   ├── auth.ts                  # lucia-auth 設定
│   │   ├── db.ts                    # SQLite 接続
│   │   └── redis.ts                 # Redis 接続
│   ├── middleware.ts                # 認証ミドルウェア
│   └── env.d.ts
├── drizzle.config.ts
└── data/
    └── dashboard.db                 # SQLite ファイル
```

---

## ページ一覧

| パス | レンダリング | 認証 | 説明 |
|------|-------------|------|------|
| `/` | SSG | 不要 | ランディングページ |
| `/login` | SSG | 不要 | ログインボタン表示 |
| `/dashboard` | SSR | 必要 | ギルド一覧表示 |
| `/dashboard/{guildId}` | SSR | 必要 + 権限 | チャンネル設定 |

---

## UI コンポーネント

### ChannelSelector (Preact Island)

チャンネルの選択と設定保存を担当するメインコンポーネントです。

```tsx
// dashboard/src/components/ChannelSelector.tsx

import { useState } from 'preact/hooks';

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface Props {
  guildId: string;
  channels: Channel[];
  initialWhitelist: string[];
  initialAllowAll: boolean;
  initialVersion: number;
  csrfToken: string;
}

export default function ChannelSelector({ 
  guildId, 
  channels, 
  initialWhitelist, 
  initialAllowAll,
  initialVersion,
  csrfToken,
}: Props) {
  const [allowAll, setAllowAll] = useState(initialAllowAll);
  const [whitelist, setWhitelist] = useState<Set<string>>(new Set(initialWhitelist));
  const [version, setVersion] = useState(initialVersion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // クライアントサイド検索（P0対応）
  const filteredChannels = channels.filter(ch => 
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'If-Match': `"${version}"`,
        },
        body: JSON.stringify({
          allowAllChannels: allowAll,
          whitelist: Array.from(whitelist),
        }),
      });
      
      if (response.status === 409) {
        setError('設定が他のユーザーによって更新されました。ページを再読み込みしてください。');
        return;
      }
      
      if (!response.ok) {
        // P1対応: content-type を確認してから JSON パース
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setError('予期しないエラーが発生しました。');
          return;
        }
        
        const data = await response.json();
        
        // 503 は結果整合モデルで別途処理
        if (response.status === 503) {
          await handleSaveError(response, guildId, data);
          return;
        }
        
        setError(data.error?.message || '保存に失敗しました。再度お試しください。');
        return;
      }
      
      const data = await response.json();
      setVersion(data.version); // 新しい version を保持
      setError(null);
      
      // 成功メッセージを短時間表示
      showSuccessMessage();
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // 503 エラー時の処理（P0対応）
  const handleSaveError = async (response: Response, guildId: string, errorData: any) => {
    // 最新の設定を取得し直す
    const latestConfig = await fetchConfig(guildId);
    if (latestConfig) {
      setVersion(latestConfig.version);
      setWhitelist(new Set(latestConfig.whitelist));
      setAllowAll(latestConfig.allowAllChannels);
      
      setError('保存は完了している可能性があります。最新の状態を表示しました。再読み込みして確認してください。');
    } else {
      setError(errorData.error?.message || '設定の同期に失敗しました。');
    }
  };

  const fetchConfig = async (guildId: string) => {
    try {
      const response = await fetch(`/api/guilds/${guildId}/config`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      return null;
    }
    return null;
  };

  const toggleChannel = (channelId: string) => {
    const newWhitelist = new Set(whitelist);
    if (newWhitelist.has(channelId)) {
      newWhitelist.delete(channelId);
    } else {
      newWhitelist.add(channelId);
    }
    setWhitelist(newWhitelist);
  };

  const selectAll = () => {
    setWhitelist(new Set(filteredChannels.map(c => c.id)));
  };

  const deselectAll = () => {
    setWhitelist(new Set());
  };

  // チャンネル ID 直接追加（P0対応）
  const [directChannelId, setDirectChannelId] = useState('');
  
  const handleAddDirectChannel = () => {
    if (/^\d{17,19}$/.test(directChannelId)) {
      setWhitelist(new Set([...whitelist, directChannelId]));
      setDirectChannelId('');
      setError(null);
    } else {
      setError('チャンネル ID は 17〜19 桁の数字です');
    }
  };

  return (
    <div class="channel-selector">
      {error && <div class="error-message">{error}</div>}
      
      <div class="toggle-section">
        <label>
          <input 
            type="checkbox" 
            checked={allowAll} 
            onChange={(e) => setAllowAll(e.currentTarget.checked)} 
          />
          全チャンネルで応答する
        </label>
      </div>

      {!allowAll && (
        <>
          {channels.length > 0 ? (
            <>
              {/* クライアントサイド検索（P0対応） */}
              <div class="channel-search">
                <input
                  type="text"
                  placeholder="チャンネルを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  className="search-input"
                />
              </div>

              <div class="channel-list">
                <div class="bulk-actions">
                  <button onClick={selectAll}>全選択</button>
                  <button onClick={deselectAll}>全解除</button>
                </div>
                
                {filteredChannels.map(channel => (
                  <label key={channel.id} class="channel-item">
                    <input
                      type="checkbox"
                      checked={whitelist.has(channel.id)}
                      onChange={() => toggleChannel(channel.id)}
                    />
                    # {channel.name}
                  </label>
                ))}
                
                {filteredChannels.length === 0 && (
                  <p class="no-results">検索条件に一致するチャンネルがありません</p>
                )}
              </div>

              {/* チャンネル ID 直接追加（P0対応） */}
              <div class="direct-add">
                <p class="direct-add-label">チャンネル ID を直接追加:</p>
                <div class="direct-add-input-group">
                  <input
                    type="text"
                    placeholder="チャンネル ID を入力"
                    value={directChannelId}
                    onChange={(e) => setDirectChannelId(e.currentTarget.value)}
                    className="direct-add-input"
                  />
                  <button 
                    onClick={handleAddDirectChannel}
                    className="direct-add-button"
                  >
                    追加
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div class="no-channels-warning">
              <p class="no-channels">Bot がチャンネル情報を取得中です。しばらくお待ちください。</p>
              <p class="no-channels-hint">
                ⚠️ この状態が続く場合、Bot がオフラインの可能性があります。
                Bot が起動しているか確認してください。
              </p>
              <button 
                onClick={() => handleRefreshChannels()}
                className="btn-refresh"
              >
                🔄 チャンネル一覧を再取得
              </button>
            </div>
          )}
        </>
      )}

      <button 
        class="save-button" 
        onClick={handleSave} 
        disabled={saving || (!allowAll && whitelist.size === 0)}
      >
        {saving ? '保存中...' : '設定を保存'}
      </button>
      
      {!allowAll && whitelist.size === 0 && (
        <p class="validation-hint">少なくとも1つのチャンネルを選択してください</p>
      )}
    </div>
  );
}
```

### セッション期限警告

セッション有効期限を表示し、24時間以内なら警告を表示します（P1対応）。

```tsx
// dashboard/src/components/SessionExpiryWarning.tsx

import { useState, useEffect } from 'preact/hooks';

interface Props {
  expiresAt: number;
}

export default function SessionExpiryWarning({ expiresAt }: Props) {
  const [now, setNow] = useState(Date.now());
  
  // 1分ごとに更新
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
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

### エラー表示

各種エラー状態に応じたバナーを表示します。

#### 401 エラー（セッション期限切れ）

```tsx
// dashboard/src/components/ErrorBanner.tsx

export function SessionExpiredBanner() {
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

#### 404 エラー（Bot未参加/オフライン）

```tsx
export function BotOfflineError({ hint }: { hint?: string }) {
  const [retrying, setRetrying] = useState(false);
  
  const handleRetry = async () => {
    setRetrying(true);
    await new Promise(r => setTimeout(r, 3000));
    window.location.reload();
  };
  
  return (
    <div className="error-banner recoverable">
      <p>Bot がこのサーバーに参加していないか、オフラインの可能性があります。</p>
      <p className="startup-notice">
        ⏳ Bot 起動直後の場合、数秒後に再試行してください。
      </p>
      {hint && <p className="hint">{hint}</p>}
      <button onClick={handleRetry} disabled={retrying}>
        {retrying ? '確認中...' : '🔄 数秒後に再試行'}
      </button>
    </div>
  );
}
```

#### 設定未作成時の表示

```tsx
export function ConfigNotFoundView({ guildId }: { guildId: string }) {
  const [initializing, setInitializing] = useState(false);
  
  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch(`/api/guilds/${guildId}/config:initialize`, { method: 'POST' });
      window.location.reload();
    } finally {
      setInitializing(false);
    }
  };
  
  return (
    <div className="config-not-found">
      <h2>設定が初期化されていません</h2>
      <p>このサーバーの設定はまだ作成されていません。</p>
      <p>「初期化」ボタンを押して設定を作成してください。</p>
      <button onClick={handleInitialize} disabled={initializing}>
        {initializing ? '初期化中...' : '⚙️ 設定を初期化'}
      </button>
    </div>
  );
}
```

#### Redis 障害時の表示

```tsx
export function HealthStatusBanner() {
  const { data: health } = useHealthCheck();
  
  if (health?.redis === 'down') {
    return (
      <div className="banner banner-error">
        ⚠️ Redis に接続できません。Bot は安全側停止モードで動作中です。
        設定変更は Redis 復旧後に反映されます。
      </div>
    );
  }
  
  if (health?.subscription === 'disconnected') {
    return (
      <div className="banner banner-warning">
        ⚡ リアルタイム同期が一時的に無効です。
        設定変更の反映に最大30秒かかる場合があります。
      </div>
    );
  }
  
  return null;
}
```

---

## スタイリング例

```css
/* dashboard/src/styles/components.css */

.channel-selector {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.toggle-section {
  margin-bottom: 2rem;
}

.channel-search {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.channel-list {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.bulk-actions {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}

.channel-item {
  display: block;
  padding: 0.5rem;
  cursor: pointer;
}

.channel-item:hover {
  background: #f5f5f5;
}

.direct-add {
  margin-top: 1rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
}

.direct-add-input-group {
  display: flex;
  gap: 0.5rem;
}

.direct-add-input {
  flex: 1;
  padding: 0.5rem;
}

.save-button {
  background: #5865F2;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

.save-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.no-channels-warning {
  padding: 2rem;
  text-align: center;
  color: #666;
}

.btn-refresh {
  background: #43B581;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.error-banner {
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.error-banner.session-expired {
  background: #fee;
  border: 1px solid #fcc;
}

.error-banner.recoverable {
  background: #fef3cd;
  border: 1px solid #ffc107;
}

.warning-banner {
  padding: 1rem;
  border-radius: 4px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  margin: 1rem 0;
}

.banner-error {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
}

.banner-warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
}
```

---

## 関連ドキュメント

- [DASHBOARD_SPEC.md](DASHBOARD_SPEC.md) - メイン仕様書
- [DASHBOARD_API_IMPLEMENTATION.md](DASHBOARD_API_IMPLEMENTATION.md) - API 実装ガイド
- [DASHBOARD_AUTH_IMPLEMENTATION.md](DASHBOARD_AUTH_IMPLEMENTATION.md) - 認証・認可実装
- [DASHBOARD_BOT_IMPLEMENTATION.md](DASHBOARD_BOT_IMPLEMENTATION.md) - Bot 側実装
- [DASHBOARD_DEPLOYMENT.md](DASHBOARD_DEPLOYMENT.md) - デプロイ・運用ガイド
