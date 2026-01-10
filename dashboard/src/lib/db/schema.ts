import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ユーザーセッション（lucia-auth管理）
export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  avatar: text("avatar"),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(),
});

// ギルド設定
export const guildConfigs = sqliteTable("guild_config", {
  guildId: text("guild_id").primaryKey(),
  allowAllChannels: integer("allow_all_channels", { mode: "boolean" }).notNull().default(true),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
});

// ホワイトリスト（whitelist）
export const channelWhitelist = sqliteTable("channel_whitelist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id")
    .notNull()
    .references(() => guildConfigs.guildId, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull(),
});

// 監査ログ
export const configAuditLogs = sqliteTable("config_audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(), // 'create', 'update'
  oldVersion: integer("old_version"),
  newVersion: integer("new_version").notNull(),
  changes: text("changes").notNull(), // JSON文字列
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// 型定義
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type GuildConfig = typeof guildConfigs.$inferSelect;
export type ChannelWhitelist = typeof channelWhitelist.$inferSelect;
export type ConfigAuditLog = typeof configAuditLogs.$inferSelect;
