import axios from "axios";
import { VxTwitter } from "./vxtwitter";

export class VxTwitterServerError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "VxTwitterServerError";
  }
}

export class VxTwitterApi {
  async getPostInformation(url: string): Promise<VxTwitter | undefined> {
    try {
      return (await axios.get(url)).data;
    } catch (e) {
      // 404はツイートが存在しないことを示す正常な応答
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;

        // 500エラーの場合は特別にエラーを投げる（フォールバック用）
        if (status === 500) {
          throw new VxTwitterServerError(status, `VxTwitter API returned 500 error for ${url}`);
        }

        if (status !== 404 && process.env.NODE_ENV !== "test") {
          console.error(`[VxTwitterApi] API request failed (${status}):`, e.message);
        }
      }
      return undefined;
    }
  }
}
