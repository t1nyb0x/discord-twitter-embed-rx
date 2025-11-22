import { describe, it, expect } from "vitest";
import { createMockTweet, MOCK_TWEET_WITH_QUOTE, MOCK_TWEET_WITH_PHOTO } from "../../../fixtures/mock-tweets";
import { DiscordEmbedBuilder } from "@/adapters/discord/EmbedBuilder";

describe("DiscordEmbedBuilder", () => {
  const builder = new DiscordEmbedBuilder();

  describe("build", () => {
    it("基本的なツイートからEmbedを生成できる", () => {
      const tweet = createMockTweet();
      const embeds = builder.build(tweet);

      expect(embeds).toHaveLength(1);
      const embed = embeds[0];
      const embedData = embed.toJSON();

      expect(embedData.author?.name).toBe(tweet.author.name);
      expect(embedData.author?.url).toBe(tweet.author.url);
      expect(embedData.author?.icon_url).toBe(tweet.author.iconUrl);
      expect(embedData.title).toBe(tweet.author.name);
      expect(embedData.url).toBe(tweet.url);
      expect(embedData.description).toBe(tweet.text);
      expect(embedData.timestamp).toBeDefined();
    });

    it("メトリクス情報がフィールドに含まれる", () => {
      const tweet = createMockTweet({
        metrics: { replies: 10, likes: 100, retweets: 50 },
      });
      const embeds = builder.build(tweet);

      const embed = embeds[0];
      const embedData = embed.toJSON();

      expect(embedData.fields).toHaveLength(3);
      expect(embedData.fields?.[0].name).toBe(":arrow_right_hook: replies");
      expect(embedData.fields?.[0].value).toBe("10");
      expect(embedData.fields?.[1].name).toBe(":hearts: likes");
      expect(embedData.fields?.[1].value).toBe("100");
      expect(embedData.fields?.[2].name).toBe(":arrows_counterclockwise: retweets");
      expect(embedData.fields?.[2].value).toBe("50");
    });

    it("引用ツイートの情報が説明文に含まれる", () => {
      const embeds = builder.build(MOCK_TWEET_WITH_QUOTE);

      const embed = embeds[0];
      const embedData = embed.toJSON();

      expect(embedData.description).toContain("QT:");
      expect(embedData.description).toContain("@quoted_user");
      expect(embedData.description).toContain("Original tweet");
      expect(embedData.description).toContain(MOCK_TWEET_WITH_QUOTE.quote?.url);
    });

    it("メディアがない場合は1つのEmbedを返す", () => {
      const tweet = createMockTweet({ media: [] });
      const embeds = builder.build(tweet);

      expect(embeds).toHaveLength(1);
    });

    it("メディアがある場合は各メディアごとにEmbedを生成する", () => {
      const tweet = createMockTweet({
        media: [
          { url: "https://example.com/photo1.jpg", thumbnailUrl: "https://example.com/photo1.jpg", type: "photo" },
          { url: "https://example.com/photo2.jpg", thumbnailUrl: "https://example.com/photo2.jpg", type: "photo" },
        ],
      });
      const embeds = builder.build(tweet);

      expect(embeds).toHaveLength(2);
      expect(embeds[0].toJSON().image?.url).toBe("https://example.com/photo1.jpg");
      expect(embeds[1].toJSON().image?.url).toBe("https://example.com/photo2.jpg");
    });

    it("画像の場合はサムネイルURLが設定される", () => {
      const embeds = builder.build(MOCK_TWEET_WITH_PHOTO);

      expect(embeds).toHaveLength(1);
      expect(embeds[0].toJSON().image?.url).toBeDefined();
    });

    it("テキストが空の場合でもEmbedを生成できる", () => {
      const tweet = createMockTweet({ text: "" });
      const embeds = builder.build(tweet);

      expect(embeds).toHaveLength(1);
      expect(embeds[0].toJSON().description).toBeUndefined();
    });

    it("Embedの色が正しく設定される", () => {
      const tweet = createMockTweet();
      const embeds = builder.build(tweet);

      expect(embeds[0].toJSON().color).toBe(9016025);
    });
  });
});
