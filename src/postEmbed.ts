import { EmbedBuilder } from "discord.js";
import { Vxtwitter } from "./vxtwitter/vxtwitter";

export class PostEmbed {
  createEmbed(postInfo: Vxtwitter): EmbedBuilder {
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
      .setImage(
        !/\.mp4$/.test(postInfo.mediaURLs[0]) ? postInfo.mediaURLs[0] : postInfo.media_extended[0].thumbnail_url
      );

    return embed;
  }

  createMultiImageEmbed(postInfo: Vxtwitter): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = [];
    postInfo.mediaURLs.map((mediaURL, index) => {
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
        .setImage(!/\.mp4$/.test(mediaURL) ? mediaURL : postInfo.media_extended[index].thumbnail_url);

      embeds.push(embed);
    });

    return embeds;
  }
}
