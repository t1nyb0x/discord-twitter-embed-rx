import { Client, Message, TextChannel } from "discord.js";
import { TweetService } from "@/services/TweetService";
jest.mock("@/shared/wrapper");
import { getTweetData } from "@/shared/wrapper";

describe("TweetService", () => {
  let tweetService: TweetService;
  let mockClient: Client;
  let mockMessage: jest.Mocked<Message>;
  let mockChannel: jest.Mocked<TextChannel>;

  beforeEach(() => {
    tweetService = new TweetService();
    mockClient = new Client({ intents: [] });

    mockChannel = {
      sendTyping: jest.fn(),
      send: jest.fn(),
    } as unknown as jest.Mocked<TextChannel>;

    mockMessage = {
      content: "https://x.com/nhk_news/status/1895772005892513948",
      channel: mockChannel,
      reply: jest.fn(),
      suppressEmbeds: jest.fn(),
    } as unknown as jest.Mocked<Message>;

    jest.clearAllMocks();
  });

  test("TwitterURL取得し、埋込メッセージ送信", async () => {
    (getTweetData as jest.Mock).mockResolvedValue({
      text: "これはテスト投稿です",
      user: { name: "Test User", screen_name: "testuser" },
      mediaUrls: [],
    });

    await tweetService.handleTweetURLs(mockClient, mockMessage);

    expect(getTweetData).toHaveBeenCalledWith("https://x.com/nhk_news/status/1895772005892513948");
    expect(mockMessage.reply).toHaveBeenCalledTimes(1);
  });
});
