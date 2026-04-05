export default {
  // tsc はプロジェクト全体をチェックするため、ファイル引数を渡さず関数形式で定義
  "*.ts": () => ["tsc --noEmit", "oxlint --fix"],
  "src/**/*.ts": ["oxfmt --write"],
};
