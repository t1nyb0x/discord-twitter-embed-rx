import { Tweet } from "@/core/models/Tweet";

/**
 * ツイート処理に関するビジネスロジックを集約
 */
export class TweetProcessor {
  private readonly TWITTER_URL_REGEX = /https:\/\/(x|twitter)\.com\/[A-Za-z_0-9]+\/status\/[0-9]+/g;

  /**
   * テキストからツイートURLを抽出する
   * @param text 抽出対象のテキスト
   * @returns 重複を除いたURL配列
   */
  extractUrls(text: string): string[] {
    const matches = text.match(this.TWITTER_URL_REGEX);
    if (!matches) return [];

    // 重複を除去
    return [...new Set(matches)];
  }

  /**
   * URLリストをスポイラー対象とそうでないものに分類する
   * @param urls URL配列
   * @param content 元のメッセージコンテンツ
   * @returns スポイラー対象とそうでないURLのオブジェクト
   */
  categorizeBySpoiler(
    urls: string[],
    content: string
  ): {
    spoiler: string[];
    normal: string[];
  } {
    const spoiler: string[] = [];
    const normal: string[] = [];

    urls.forEach((url) => {
      // URLがスポイラータグ(||)で囲まれているかチェック
      const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const spoilerPattern = new RegExp(`\\|\\|\\s*${escapedUrl}(\\?.*?)?(#.*?)?\\s*\\|\\|`);

      if (spoilerPattern.test(content)) {
        spoiler.push(url);
      } else {
        normal.push(url);
      }
    });

    return { spoiler, normal };
  }

  /**
   * ツイートに引用が含まれるか判定
   * @param tweet ツイートデータ
   * @returns 引用があればtrue
   */
  hasQuote(tweet: Tweet): boolean {
    return tweet.quote !== undefined;
  }

  /**
   * ツイートにメディアが含まれるか判定
   * @param tweet ツイートデータ
   * @returns メディアがあればtrue
   */
  hasMedia(tweet: Tweet): boolean {
    return tweet.media.length > 0;
  }

  /**
   * 動画メディアのみをフィルタリング
   * @param tweet ツイートデータ
   * @returns 動画URL配列
   */
  getVideoUrls(tweet: Tweet): string[] {
    return tweet.media.filter((media) => media.type === "video").map((media) => media.url);
  }
}
