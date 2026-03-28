# @twitterrx/shared

TwitterRX Bot と Dashboard 間で共有される型定義パッケージ

## 使い方

### Bot 側（TypeScript）

```typescript
import type { GuildConfig, IChannelConfigRepository } from "@twitterrx/shared";

class RedisChannelConfigRepository implements IChannelConfigRepository {
  async getConfig(guildId: string): Promise<ConfigResult> {
    // 実装...
  }
}
```

### Dashboard 側（Astro + TypeScript）

```typescript
import type { GuildConfig } from "@twitterrx/shared";

// API レスポンス型として利用
interface ApiResponse {
  config: GuildConfig;
}
```

## 提供される型

- `GuildConfig`: ギルド設定の型
- `ConfigResult`: 設定取得結果（三値型: found/not_found/error）
- `IChannelConfigRepository`: チャンネル設定リポジトリのインターフェース
- `ConfigUpdateMessage`: Redis Pub/Sub メッセージ型
