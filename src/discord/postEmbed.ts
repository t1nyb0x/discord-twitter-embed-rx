import { EmbedBuilder } from "@discordjs/builders";
import { APIEmbedField } from "discord.js";
import { TweetData } from "shared/tweetdata";

function createField(_name: string, count: number): APIEmbedField {
  return {
    inline: true,
    name: _name,
    value: String(count),
  };
}

export class PostEmbed {
  br = "\n";
  embedColor = 9016025;
  quotePrefix = "QT: ";

  /**
   * Discord埋め込みデータを作成する
   * @param post TweetData
   * @returns
   */
  createSingleEmbed(post: TweetData): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setAuthor({
        name: post.author.name,
        url: post.author.url,
        iconURL: post.author.iconUrl,
      })
      .setTitle(post.author.name)
      .setURL(post.tweetUrl)
      .setColor(this.embedColor)
      .addFields(
        createField(":arrow_right_hook: replies", post.replies),
        createField(":hearts: likes", post.likes),
        createField(":arrows_counterclockwise: retweets", post.retweets)
      )
      .setTimestamp(post.timestamp);
    let description = post.text;
    if (post.quoteData != undefined) {
      const quoteText = this.quotePrefix + "`@" + post.quoteData.author.id + "` " + post.quoteData.text;
      const quoteUrl = "(" + post.quoteData.tweetUrl + ")";
      description += this.br + this.br + quoteText + this.br + quoteUrl;
    }

    // If description is not empty
    if (description != "") {
      embed.setDescription(description);
    }

    return embed;
  }

  /**
   * Discordで表示する埋め込みデータを作成する
   * @param post
   * @returns
   */
  createEmbed(post: TweetData): EmbedBuilder[] {
    if (post.mediaUrlsThumbnail == undefined || post.mediaUrlsThumbnail.length == 0) {
      return [this.createSingleEmbed(post)];
    }

    return post.mediaUrlsThumbnail.map((url) => {
      return this.createSingleEmbed(post).setImage(url);
    });
  }
}
