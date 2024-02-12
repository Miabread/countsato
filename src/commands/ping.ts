import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { commands } from "./index.ts";
// import data from '../../package.json';

commands.push({
  data: new SlashCommandBuilder().setName("ping").setDescription(
    "Check that the bot is functional",
  ),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      fetchReply: true,
    });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Countsato v${"1.0.0"}`,
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setColor(interaction.guild?.members.me?.displayColor ?? null)
      .addFields(
        { name: "Roundtrip", value: `${latency}ms`, inline: true },
        {
          name: "Websocket",
          value: `${interaction.client.ws.ping}ms`,
          inline: true,
        },
      );

    interaction.editReply({ content: "", embeds: [embed] });
  },
});
