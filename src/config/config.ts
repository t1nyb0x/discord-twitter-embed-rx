import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ルートディレクトリ（index.ts のディレクトリ）を固定
export const ROOT_DIR = path.dirname(__dirname);
