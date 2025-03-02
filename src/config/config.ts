import fs from "node:fs";
import path from "path";
import yaml from "js-yaml";

// ルートディレクトリ取得
export const ROOT_DIR = path.dirname(__dirname);

const configPath = path.join(path.dirname(ROOT_DIR), "/.config/config.yml");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let config: any = {};
try {
  const fileContents = fs.readFileSync(configPath, "utf8");
  config = yaml.load(fileContents);
} catch (e) {
  console.error("設定ファイルの読み込みに失敗しました。config.ymlを確認してください", e);
}

export default { MEDIA_MAX_FILE_SIZE: config.media_max_file_size };
