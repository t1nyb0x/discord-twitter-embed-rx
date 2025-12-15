import { ITwitterAdapter } from "./BaseTwitterAdapter";
import { FxTwitterAdapter } from "./FxTwitterAdapter";
import { VxTwitterAdapter } from "./VxTwitterAdapter";
import { Tweet } from "@/core/models/Tweet";
import { VxTwitterServerError } from "@/vxtwitter/api";

/**
 * 複数のTwitterアダプターを統合し、フォールバック機能を提供
 */
export class TwitterAdapter implements ITwitterAdapter {
  constructor(
    private readonly primaryAdapter: ITwitterAdapter,
    private readonly fallbackAdapter: ITwitterAdapter
  ) {}

  /**
   * ツイートを取得（プライマリが失敗したらフォールバックを試行）
   * @param url ツイートURL
   * @returns ツイートデータまたはundefined
   */
  async fetchTweet(url: string): Promise<Tweet | undefined> {
    try {
      // まずプライマリアダプターで試行
      const primaryResult = await this.primaryAdapter.fetchTweet(url);
      if (primaryResult) {
        return primaryResult;
      }

      console.log("Primary adapter failed, trying fallback...");

      // フォールバックアダプターで試行
      const fallbackResult = await this.fallbackAdapter.fetchTweet(url);
      return fallbackResult;
    } catch (error) {
      // VxTwitterが500エラーを返した場合、フォールバックを試行
      if (error instanceof VxTwitterServerError) {
        console.log(`VxTwitter returned 500 error, trying FxTwitter fallback...`);
        const fallbackResult = await this.fallbackAdapter.fetchTweet(url);
        return fallbackResult;
      }
      // その他のエラーは再スロー
      throw error;
    }
  }

  /**
   * デフォルトのインスタンスを作成（VxTwitterが優先、FxTwitterがフォールバック）
   */
  static createDefault(): TwitterAdapter {
    const vxAdapter = new VxTwitterAdapter();
    const fxAdapter = new FxTwitterAdapter();
    return new TwitterAdapter(vxAdapter, fxAdapter);
  }
}
