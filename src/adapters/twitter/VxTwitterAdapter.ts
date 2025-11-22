import { BaseTwitterAdapter, ITwitterAdapter } from "./BaseTwitterAdapter";
import { Tweet, TweetMedia } from "@/core/models/Tweet";
import { VxTwitterApi } from "@/vxtwitter/api";
import { VxTwitter } from "@/vxtwitter/vxtwitter";

/**
 * VxTwitter API アダプター
 */
export class VxTwitterAdapter extends BaseTwitterAdapter implements ITwitterAdapter {
  private readonly api: VxTwitterApi;
  private readonly URL_REGEX = /\/(x|twitter)/;

  constructor(api?: VxTwitterApi) {
    super();
    this.api = api || new VxTwitterApi();
  }

  protected transformUrl(url: string): string {
    return url.replace(this.URL_REGEX, "/api.vxtwitter");
  }

  async fetchTweet(url: string): Promise<Tweet | undefined> {
    try {
      const apiUrl = this.transformUrl(url);
      const data = await this.api.getPostInformation(apiUrl);

      if (!data) {
        return undefined;
      }

      return this.convertToTweet(data);
    } catch (error) {
      // データ変換エラー（不正なデータ構造など）
      if (process.env.NODE_ENV !== "test") {
        console.error(
          "[VxTwitterAdapter] Failed to convert tweet data:",
          error instanceof Error ? error.message : String(error)
        );
      }
      return undefined;
    }
  }

  protected convertToTweet(data: unknown, depth: number = 0): Tweet | undefined {
    const vxData = data as VxTwitter;

    // 引用ツイートの変換（1階層まで）
    let quote: Tweet | undefined;
    if (vxData.qrt && depth < 1) {
      quote = this.convertToTweet(vxData.qrt, depth + 1);
    }

    // メディアの変換
    const media: TweetMedia[] = vxData.mediaURLs.map((url, index) => {
      const type = this.getMediaType(url);
      const thumbnailUrl = type === "video" ? vxData.media_extended[index]?.thumbnail_url || url : url;

      return {
        url,
        thumbnailUrl,
        type,
      };
    });

    return {
      url: vxData.tweetURL,
      author: this.createAuthor(
        vxData.user_screen_name,
        vxData.user_name,
        vxData.user_screen_name,
        vxData.user_profile_image_url
      ),
      text: vxData.text,
      metrics: this.createMetrics(vxData.replies, vxData.likes, vxData.retweets),
      media,
      quote,
      timestamp: new Date(vxData.date),
    };
  }
}
