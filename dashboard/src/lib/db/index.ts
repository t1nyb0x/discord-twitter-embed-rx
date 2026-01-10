import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL || "file:./data/dashboard.db";

// URLからファイルパスを抽出（file:プレフィックスを除去）
const dbPath = DATABASE_URL.replace(/^file:/, "");

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
