import { EmbedBuilder } from "@discordjs/builders";
import { VxTwitter } from "./vxtwitter/vxtwitter";

export class PostEmbed {
  createEmbed(postInfo: VxTwitter): EmbedBuilder[] {
    const qrtText = postInfo.qrt ? "\n\nQT: @" + postInfo.qrt.user_screen_name + " " + postInfo.qrt.text : "";
    const qrtURL = postInfo.qrtURL ? "\n(" + postInfo.qrtURL + ")" : "";

    if (!postInfo.mediaURLs.length) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: postInfo.user_name + "(@" + postInfo.user_screen_name + ")",
          url: "https://x.com/" + postInfo.user_screen_name,
          iconURL: postInfo.user_profile_image_url,
        })
        .setTitle(postInfo.user_name + "(@" + postInfo.user_screen_name + ")")
        .setURL(postInfo.tweetURL)
        .setDescription(postInfo.text + qrtText + qrtURL)
        .setColor(9016025)
        .addFields(
          {
            inline: true,
            name: ":arrow_right_hook: replies",
            value: String(postInfo.replies),
          },
          {
            inline: true,
            name: ":hearts: likes",
            value: String(postInfo.likes),
          },
          {
            inline: true,
            name: ":arrows_counterclockwise: retweets",
            value: String(postInfo.retweets),
          }
        )
        .setTimestamp(new Date(postInfo.date));

      return [embed];
    } else {
      const embeds = postInfo.mediaURLs.map((mediaURL, index) => {
        const embed = new EmbedBuilder()
          .setAuthor({
            name: postInfo.user_name + "(@" + postInfo.user_screen_name + ")",
            url: "https://x.com/" + postInfo.user_screen_name,
            iconURL: postInfo.user_profile_image_url,
          })
          .setTitle(postInfo.user_name + "(@" + postInfo.user_screen_name + ")")
          .setURL(postInfo.tweetURL)
          .setDescription(postInfo.text + qrtText + qrtURL)
          .setColor(9016025)
          .addFields(
            {
              inline: true,
              name: ":arrow_right_hook: replies",
              value: String(postInfo.replies),
            },
            {
              inline: true,
              name: ":hearts: likes",
              value: String(postInfo.likes),
            },
            {
              inline: true,
              name: ":arrows_counterclockwise: retweets",
              value: String(postInfo.retweets),
            }
          )
          .setTimestamp(new Date(postInfo.date))
          .setImage(!/\.mp4$/.test(mediaURL) ? mediaURL : postInfo.media_extended[index].thumbnail_url);

        return embed;
      });
      return embeds;
    }
  }
}
