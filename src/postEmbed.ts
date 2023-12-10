import { EmbedBuilder } from "discord.js";
import { Vxtwitter } from "./vxtwitter/vxtwitter";

export class PostEmbed {
  createEmbed(postInfo: Vxtwitter): EmbedBuilder[] {
    const embedData: EmbedBuilder[] = [];
    postInfo.mediaURLs.map((mediaURL) => {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: postInfo.user_name,
          url: "https://twitter.com/" + postInfo.user_screen_name,
          iconURL: postInfo.user_profile_image_url,
        })
        .setTitle(postInfo.user_name)
        .setURL(postInfo.tweetURL)
        .setDescription(postInfo.text)
        .setColor(9016025)
        .setTimestamp(new Date(postInfo.date))
        .setImage(mediaURL);

      embedData.push(embed);
    });

    return embedData;
  }
}
