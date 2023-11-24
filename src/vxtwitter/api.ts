import axios from "axios";
import { Vxtwitter } from "./vxtwitter";

export class VxTwitterApi {
  async getPostInformation(url: string): Promise<Vxtwitter> {
    let postInfo;
    try {
      postInfo = await axios.get(url);
    } catch (e) {
      console.error(e);
    }
    return postInfo!.data;
  }
}
