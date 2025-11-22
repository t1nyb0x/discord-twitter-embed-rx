export const TEST_URLS = {
  // 基本テスト用
  NORMAL_TWEET: "https://x.com/Yahoo_weather/status/1823458714147586362",
  QUOTE_TWEET: "https://x.com/owada_hitomi/status/1991425545578639663?t=P2h5qefUJNDrnMHKRWDeHQ&s=19",

  // メディアテスト用
  VIDEO_SMALL: "https://x.com/bou128/status/1870044090072739960",
  VIDEO_LARGE: "https://x.com/dolphin_HPG/status/1890325106888495363?t=mU3LKT3V2KRKsYkoPgIF2A&s=19",

  // エラーテスト用
  INVALID: "https://x.com/invalid_user/status/0000000000000000000",
} as const;

export const TEST_MESSAGES = {
  // 複数URL
  MULTIPLE_URLS: `Check these: ${TEST_URLS.NORMAL_TWEET} ${TEST_URLS.VIDEO_SMALL}`,

  // 重複URL
  DUPLICATE_URLS: `Same tweet: ${TEST_URLS.NORMAL_TWEET} and ${TEST_URLS.NORMAL_TWEET}`,

  // スポイラー
  SPOILER_SINGLE: `||${TEST_URLS.NORMAL_TWEET}||`,
  SPOILER_MIXED: `Normal: ${TEST_URLS.VIDEO_SMALL} and ||${TEST_URLS.NORMAL_TWEET}||`,
} as const;
