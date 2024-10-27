import { EmbedBuilder } from "discord.js";
import { VxTwitter } from "./vxtwitter/vxtwitter";

export class PostEmbed {
  createEmbed(postInfo: VxTwitter): EmbedBuilder[] {
    if (!postInfo.mediaURLs.length) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: postInfo.user_name,
          url: "https://x.com/" + postInfo.user_screen_name,
          iconURL: postInfo.user_profile_image_url,
        })
        .setTitle(postInfo.user_name)
        .setURL(postInfo.tweetURL)
        .setDescription(postInfo.text)
        .setColor(9016025)
        .setTimestamp(new Date(postInfo.date));

      return [embed];
    } else {
      const embeds = postInfo.mediaURLs.map((mediaURL, index) => {
        const embed = new EmbedBuilder()
          .setAuthor({
            name: postInfo.user_name,
            url: "https://x.com/" + postInfo.user_screen_name,
            iconURL: postInfo.user_profile_image_url,
          })
          .setTitle(postInfo.user_name)
          .setURL(postInfo.tweetURL)
          .setDescription(postInfo.text)
          .setColor(9016025)
          .setTimestamp(new Date(postInfo.date))
          .setImage(!/\.mp4$/.test(mediaURL) ? mediaURL : postInfo.media_extended[index].thumbnail_url);

        return embed;
      });
      return embeds;
    }
  }
}
