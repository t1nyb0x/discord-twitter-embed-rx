import axios from "axios";
import { VxTwitter } from "./vxtwitter";

export class VxTwitterApi {
  async getPostInformation(url: string): Promise<VxTwitter> {
    let postInfo;
    try {
      postInfo = await axios.get(url);
    } catch (e) {
      console.error(e);
    }
    return postInfo!.data;
  }
}
