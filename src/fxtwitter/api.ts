import axios from "axios";
import { FXTwitter } from "./fxtwitter";

export class FxTwitterApi {
  async getPostInformation(url: string): Promise<FXTwitter | undefined> {
    try {
      return await axios.get(url);
    } catch (e) {
      // 404はツイートが存在しないことを示す正常な応答
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        if (status !== 404 && process.env.NODE_ENV !== "test") {
          console.error(`[FxTwitterApi] API request failed (${status}):`, e.message);
        }
      }
      return undefined;
    }
  }
}
