import { TweetMedia } from "@/core/models/Tweet";
import logger from "@/utils/logger";

export interface MediaFilterResult {
  downloadable: TweetMedia[];
  tooLarge: TweetMedia[];
}

export interface IFileSizeChecker {
  getFileSize(url: string): Promise<number>;
}

/**
 * メディア処理に関するビジネスロジックを集約
 */
export class MediaHandler {
  constructor(
    private readonly fileSizeChecker: IFileSizeChecker,
    private readonly maxFileSize: number
  ) {}

  /**
   * メディアをファイルサイズでフィルタリング
   * @param media メディア配列
   * @returns ダウンロード可能なものと大きすぎるものに分けた結果
   */
  async filterBySize(media: TweetMedia[]): Promise<MediaFilterResult> {
    const results = await Promise.all(
      media.map(async (item) => {
        try {
          const size = await this.fileSizeChecker.getFileSize(item.url);
          return { media: item, size, error: null };
        } catch (error) {
          logger.error("Error checking file size", {
            url: item.url,
            error: error instanceof Error ? error.message : String(error),
          });
          return { media: item, size: Infinity, error };
        }
      })
    );

    const downloadable = results.filter((r) => r.size <= this.maxFileSize && r.error === null).map((r) => r.media);

    const tooLarge = results.filter((r) => r.size > this.maxFileSize || r.error !== null).map((r) => r.media);

    return { downloadable, tooLarge };
  }

  /**
   * 動画メディアか判定
   * @param media メディアデータ
   * @returns 動画の場合true
   */
  isVideo(media: TweetMedia): boolean {
    return media.type === "video";
  }

  /**
   * 動画メディアのみをフィルタリング
   * @param media メディア配列
   * @returns 動画のみの配列
   */
  filterVideos(media: TweetMedia[]): TweetMedia[] {
    return media.filter((m) => this.isVideo(m));
  }

  /**
   * 画像メディアのみをフィルタリング
   * @param media メディア配列
   * @returns 画像のみの配列
   */
  filterPhotos(media: TweetMedia[]): TweetMedia[] {
    return media.filter((m) => !this.isVideo(m));
  }
}
