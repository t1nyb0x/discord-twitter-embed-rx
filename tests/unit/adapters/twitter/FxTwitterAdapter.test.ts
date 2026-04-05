import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FxTwitterApi } from "@/fxtwitter/api";
import type { FXTwitter, Tweet as FxTweet, Author, Media, Photo } from "@/fxtwitter/fxtwitter";
import { FxTwitterAdapter } from "@/adapters/twitter/FxTwitterAdapter";

vi.mock("@/utils/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const createFxAuthor = (overrides: Partial<Author> = {}): Author => ({
  id: "test_user",
  name: "Test User",
  screen_name: "test_user",
  avatar_url: "https://example.com/icon.jpg",
  avatar_color: "#000000",
  banner_url: "https://example.com/banner.jpg",
  ...overrides,
});

const createFxTweet = (overrides: Partial<FxTweet> = {}): FxTweet => ({
  url: "https://x.com/test_user/status/123456789",
  id: "123456789",
  text: "This is a test tweet",
  author: createFxAuthor(),
  replies: 10,
  retweets: 50,
  likes: 100,
  color: "#000000",
  twitter_card: "summary",
  created_at: "2024-01-01T00:00:00.000Z",
  created_timestamp: 1704067200,
  possibly_sensitive: false,
  views: 1000,
  lang: "ja",
  replying_to: "",
  replying_to_status: "",
  media: undefined,
  source: "",
  quote: undefined,
  ...overrides,
});

const createFxPhoto = (overrides: Partial<Photo> = {}): Photo => ({
  type: "photo",
  thumbnail_url: "https://example.com/photo_thumb.jpg",
  url: "https://example.com/photo.jpg",
  width: 1920,
  height: 1080,
  altText: "",
  ...overrides,
});

const createFxMedia = (photos: Photo[] = []): Media => ({ photos });

const createFxResponse = (tweet: FxTweet): FXTwitter => ({
  code: 200,
  message: "OK",
  tweet,
});

describe("FxTwitterAdapter", () => {
  let mockApi: { getPostInformation: ReturnType<typeof vi.fn> };
  let adapter: FxTwitterAdapter;

  beforeEach(() => {
    mockApi = { getPostInformation: vi.fn() };
    adapter = new FxTwitterAdapter(mockApi as FxTwitterApi);
  });

  describe("fetchTweet", () => {
    it("正常なレスポンスからTweetモデルを生成できる", async () => {
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(createFxTweet()));

      const result = await adapter.fetchTweet("https://x.com/test_user/status/123456789");

      expect(result).toBeDefined();
      expect(result?.url).toBe("https://x.com/test_user/status/123456789");
      expect(result?.text).toBe("This is a test tweet");
      expect(result?.author.name).toBe("Test User(@test_user)");
      expect(result?.metrics.likes).toBe(100);
      expect(result?.metrics.replies).toBe(10);
      expect(result?.metrics.retweets).toBe(50);
    });

    it("URL を fxtwitter 形式に変換してリクエストする", async () => {
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(createFxTweet()));

      await adapter.fetchTweet("https://x.com/user/status/123");

      expect(mockApi.getPostInformation).toHaveBeenCalledWith("https://api.fxtwitter.com/user/status/123");
    });

    it("twitter.com の URL も変換できる", async () => {
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(createFxTweet()));

      await adapter.fetchTweet("https://twitter.com/user/status/123");

      expect(mockApi.getPostInformation).toHaveBeenCalledWith("https://api.fxtwitter.com/user/status/123");
    });

    it("画像メディアを含むツイートを変換できる", async () => {
      const tweet = createFxTweet({
        media: createFxMedia([createFxPhoto()]),
      });
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(tweet));

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result?.media).toHaveLength(1);
      expect(result?.media[0].type).toBe("photo");
      expect(result?.media[0].url).toBe("https://example.com/photo.jpg");
      expect(result?.media[0].thumbnailUrl).toBe("https://example.com/photo_thumb.jpg");
    });

    it("複数の画像メディアを変換できる", async () => {
      const tweet = createFxTweet({
        media: createFxMedia([
          createFxPhoto({ url: "https://example.com/photo1.jpg" }),
          createFxPhoto({ url: "https://example.com/photo2.jpg" }),
        ]),
      });
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(tweet));

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result?.media).toHaveLength(2);
    });

    it("メディアがない場合 media は空配列になる", async () => {
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(createFxTweet({ media: undefined })));

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result?.media).toEqual([]);
    });

    it("引用ツイートが含まれる場合 quote が設定される", async () => {
      const quotedTweet = createFxTweet({
        url: "https://x.com/quoted_user/status/999",
        author: createFxAuthor({ screen_name: "quoted_user", name: "Quoted User" }),
        text: "Original tweet",
      });
      const tweet = createFxTweet({ quote: quotedTweet, text: "Check this!" });
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(tweet));

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result?.quote).toBeDefined();
      expect(result?.quote?.url).toBe("https://x.com/quoted_user/status/999");
      expect(result?.quote?.text).toBe("Original tweet");
    });

    it("quote が入れ子 2階層目は変換しない（depth 制限）", async () => {
      const deepQuote = createFxTweet({ text: "deep nested" });
      const quotedTweet = createFxTweet({ quote: deepQuote, text: "level 1 quote" });
      const tweet = createFxTweet({ quote: quotedTweet });
      mockApi.getPostInformation.mockResolvedValue(createFxResponse(tweet));

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result?.quote).toBeDefined();
      expect(result?.quote?.quote).toBeUndefined();
    });

    it("API が undefined を返す場合 undefined を返す", async () => {
      mockApi.getPostInformation.mockResolvedValue(undefined);

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result).toBeUndefined();
    });

    it("レスポンスに tweet が含まれない場合 undefined を返す", async () => {
      mockApi.getPostInformation.mockResolvedValue({ code: 404, message: "Not Found", tweet: null });

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result).toBeUndefined();
    });

    it("API がエラーを投げた場合 undefined を返す", async () => {
      mockApi.getPostInformation.mockRejectedValue(new Error("network error"));

      const result = await adapter.fetchTweet("https://x.com/user/status/123");

      expect(result).toBeUndefined();
    });
  });
});
