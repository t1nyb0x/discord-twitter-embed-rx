import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelType } from "discord.js";

import type { ITwitterAdapter } from "@/adapters/twitter/BaseTwitterAdapter";
import type { IFileManager, IVideoDownloader } from "@/adapters/discord/MessageHandler";
import { MessageHandler } from "@/adapters/discord/MessageHandler";
import type { IReplyLogger } from "@/db/replyLogger";
import type { ChannelConfigService } from "@/core/services/ChannelConfigService";
import type { MediaHandler } from "@/core/services/MediaHandler";
import type { TweetProcessor } from "@/core/services/TweetProcessor";
import type { DiscordEmbedBuilder } from "@/adapters/discord/EmbedBuilder";
import { createMockTweet } from "../../../fixtures/mock-tweets";

vi.mock("@/utils/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const createMockClient = () =>
  ({
    user: { id: "bot-user-id" },
    on: vi.fn(),
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const createMockMessage = (overrides: Record<string, unknown> = {}) =>
  ({
    author: { bot: false, id: "user-id" },
    channel: {
      type: ChannelType.GuildText,
      sendTyping: vi.fn().mockResolvedValue(undefined),
    },
    content: "Check this https://x.com/user/status/123456789",
    id: "msg-id",
    guildId: "guild-id",
    channelId: "channel-id",
    guild: null,
    suppressEmbeds: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue({ id: "reply-msg-id" }),
    ...overrides,
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("MessageHandler", () => {
  let processor: TweetProcessor;
  let twitterAdapter: ITwitterAdapter;
  let embedBuilder: DiscordEmbedBuilder;
  let mediaHandler: MediaHandler;
  let fileManager: IFileManager;
  let videoDownloader: IVideoDownloader;
  let replyLogger: IReplyLogger;
  let handler: MessageHandler;

  beforeEach(() => {
    processor = {
      extractUrls: vi.fn().mockReturnValue(["https://x.com/user/status/123456789"]),
      categorizeBySpoiler: vi.fn().mockReturnValue({
        normal: ["https://x.com/user/status/123456789"],
        spoiler: [],
      }),
    } as unknown as TweetProcessor;

    twitterAdapter = {
      fetchTweet: vi.fn().mockResolvedValue(createMockTweet()),
    };

    embedBuilder = {
      build: vi.fn().mockReturnValue([]),
    } as unknown as DiscordEmbedBuilder;

    mediaHandler = {
      filterBySize: vi.fn().mockResolvedValue({ downloadable: [], tooLarge: [] }),
    } as unknown as MediaHandler;

    fileManager = {
      createTempDirectory: vi.fn().mockResolvedValue("/tmp/test"),
      createDirectory: vi.fn().mockResolvedValue("/tmp/test/sub"),
      removeTempDirectory: vi.fn().mockResolvedValue(undefined),
      listFiles: vi.fn().mockResolvedValue([]),
    };

    videoDownloader = {
      download: vi.fn().mockResolvedValue(undefined),
    };

    replyLogger = {
      logReply: vi.fn().mockResolvedValue(undefined),
      addReply: vi.fn().mockResolvedValue(undefined),
      popReply: vi.fn().mockResolvedValue(null),
      deleteReply: vi.fn().mockResolvedValue(undefined),
    };

    handler = new MessageHandler(
      processor,
      twitterAdapter,
      embedBuilder,
      mediaHandler,
      fileManager,
      videoDownloader,
      replyLogger,
      "/tmp"
    );
  });

  describe("handleMessage - 無視すべきメッセージ", () => {
    it("ボットのメッセージは無視する", async () => {
      const client = createMockClient();
      const message = createMockMessage({ author: { bot: true, id: "other-bot" } });

      await handler.handleMessage(client, message);

      expect(processor.extractUrls).not.toHaveBeenCalled();
    });

    it("自分自身（Bot）のメッセージは無視する", async () => {
      const client = createMockClient();
      const message = createMockMessage({ author: { bot: false, id: "bot-user-id" } });

      await handler.handleMessage(client, message);

      expect(processor.extractUrls).not.toHaveBeenCalled();
    });

    it("Twitter URL が含まれないメッセージは処理しない", async () => {
      vi.mocked(processor.extractUrls).mockReturnValue([]);
      const client = createMockClient();
      const message = createMockMessage({ content: "just a normal message" });

      await handler.handleMessage(client, message);

      expect(twitterAdapter.fetchTweet).not.toHaveBeenCalled();
    });
  });

  describe("handleMessage - チャンネル設定チェック", () => {
    it("channelConfigService が不許可を返す場合 URL を処理しない", async () => {
      const channelConfigService = {
        isChannelAllowed: vi.fn().mockResolvedValue(false),
        performHealthCheck: vi.fn(),
      } as unknown as ChannelConfigService;

      const handlerWithConfig = new MessageHandler(
        processor,
        twitterAdapter,
        embedBuilder,
        mediaHandler,
        fileManager,
        videoDownloader,
        replyLogger,
        "/tmp",
        channelConfigService
      );

      const client = createMockClient();
      const message = createMockMessage();

      await handlerWithConfig.handleMessage(client, message);

      expect(channelConfigService.isChannelAllowed).toHaveBeenCalledWith("guild-id", "channel-id");
      expect(twitterAdapter.fetchTweet).not.toHaveBeenCalled();
    });

    it("channelConfigService が許可を返す場合 URL を処理する", async () => {
      const channelConfigService = {
        isChannelAllowed: vi.fn().mockResolvedValue(true),
        performHealthCheck: vi.fn(),
      } as unknown as ChannelConfigService;

      const handlerWithConfig = new MessageHandler(
        processor,
        twitterAdapter,
        embedBuilder,
        mediaHandler,
        fileManager,
        videoDownloader,
        replyLogger,
        "/tmp",
        channelConfigService
      );

      const client = createMockClient();
      const message = createMockMessage();

      await handlerWithConfig.handleMessage(client, message);

      expect(twitterAdapter.fetchTweet).toHaveBeenCalledWith("https://x.com/user/status/123456789");
    });

    it("guildId がない場合（DM等）はチャンネル設定チェックをスキップして処理する", async () => {
      const channelConfigService = {
        isChannelAllowed: vi.fn().mockResolvedValue(false),
        performHealthCheck: vi.fn(),
      } as unknown as ChannelConfigService;

      const handlerWithConfig = new MessageHandler(
        processor,
        twitterAdapter,
        embedBuilder,
        mediaHandler,
        fileManager,
        videoDownloader,
        replyLogger,
        "/tmp",
        channelConfigService
      );

      const client = createMockClient();
      const message = createMockMessage({ guildId: null });

      await handlerWithConfig.handleMessage(client, message);

      expect(channelConfigService.isChannelAllowed).not.toHaveBeenCalled();
      expect(twitterAdapter.fetchTweet).toHaveBeenCalled();
    });
  });

  describe("handleMessage - ツイート処理", () => {
    it("ツイート取得に成功した場合 Embed を返信する", async () => {
      const client = createMockClient();
      const message = createMockMessage();

      await handler.handleMessage(client, message);

      expect(twitterAdapter.fetchTweet).toHaveBeenCalledWith("https://x.com/user/status/123456789");
      expect(message.reply).toHaveBeenCalledWith(
        expect.objectContaining({ allowedMentions: { repliedUser: false } })
      );
      expect(replyLogger.logReply).toHaveBeenCalledWith(
        "msg-id",
        expect.objectContaining({ channelId: "channel-id" })
      );
    });

    it("ツイート取得に失敗した場合（undefined）エラーメッセージを返信する", async () => {
      vi.mocked(twitterAdapter.fetchTweet).mockResolvedValue(undefined);
      const client = createMockClient();
      const message = createMockMessage();

      await handler.handleMessage(client, message);

      expect(message.reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "ツイートの取得に失敗しました。" })
      );
    });
  });
});
