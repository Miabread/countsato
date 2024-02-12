import {
  channelMention,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { commands } from "./index.ts";
import { prisma } from "../util.ts";

interface Gamerule<T> {
  addOption(sub: SlashCommandSubcommandBuilder): void;
  readOption(interaction: ChatInputCommandInteraction<"cached">): T | null;
  display(value: T): string;
}

const Boolean: Gamerule<boolean> = {
  addOption(sub) {
    sub.addBooleanOption((option) =>
      option.setName("value").setDescription("Leave blank to see current value")
        .setRequired(false)
    );
  },
  readOption(interaction) {
    return interaction.options.getBoolean("value", false);
  },
  display(value) {
    return value ? "True" : "False";
  },
};

const Integer: Gamerule<number> = {
  addOption(sub) {
    sub.addNumberOption((option) =>
      option.setName("value").setDescription("Leave blank to see current value")
        .setRequired(false)
    );
  },
  readOption(interaction) {
    return interaction.options.getNumber("value", false);
  },
  display(value) {
    return value.toString();
  },
};

const TextChannel: Gamerule<string> = {
  addOption(sub) {
    sub.addChannelOption((option) =>
      option
        .setName("value")
        .setDescription("Leave blank to see current value")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    );
  },
  readOption(interaction) {
    const value = interaction.options.getChannel("value", false, [
      ChannelType.GuildText,
    ]);
    if (value === null) return null;
    return value.id;
  },
  display(value) {
    return channelMention(value);
  },
};

const gamerules = {
  allow_double_counting: {
    title: "Allow Double Counting",
    description: "If users are able to count with themselves",
    type: Boolean,
    field: "allowDoubleCounting",
  },
  grace_milliseconds: {
    title: "Grace Milliseconds",
    description:
      "Amount of milliseconds after last valid count before invalid counts ruin the count",
    type: Integer,
    field: "graceMilliseconds",
  },
  counting_channel: {
    title: "Counting Channel",
    description: "The channel the bot listens for counting",
    type: TextChannel,
    field: "countingChannel",
  },
  meow_reactions: {
    title: "Meow Reactions",
    description: "If the bot should react to meows",
    type: Boolean,
    field: "meowReactions",
  },
} as const;

const data = new SlashCommandBuilder()
  .setName("gamerule")
  .setDescription("Edit this server's configuration")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

for (const [key, gamerule] of Object.entries(gamerules)) {
  data.addSubcommand((sub) => {
    sub.setName(key).setDescription(gamerule.description);
    gamerule.type.addOption(sub);
    return sub;
  });
}

commands.push({
  data,

  async execute(interaction) {
    if (!interaction.inCachedGuild()) throw new Error("guild");

    const where = { id: interaction.guildId };
    const data = await prisma.guild.upsert({
      where,
      create: where,
      update: {},
    });

    const key = interaction.options.getSubcommand();
    const gamerule = gamerules[key as keyof typeof gamerules];
    if (!gamerule) throw new Error("gamerule");

    const embed = new EmbedBuilder()
      .setTitle(gamerule.title)
      .setAuthor({
        name: gamerule.title,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setColor(interaction.member.displayColor);

    const value = gamerule.type.readOption(interaction);
    if (value === null) {
      embed.setTitle(gamerule.type.display(data[gamerule.field] as never));
      await interaction.reply({ embeds: [embed] });
      return;
    }

    embed.setTitle(gamerule.type.display(value as never)).setDescription(
      "Value updated!",
    );
    await prisma.guild.update({ where, data: { [gamerule.field]: value } });
    await interaction.reply({ embeds: [embed] });
  },
});
