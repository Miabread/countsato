import {
  EmbedBuilder,
  Events,
  PermissionFlagsBits,
  userMention,
} from "discord.js";
import { client } from "../index.ts";
import { prisma } from "../util.ts";

const numberRegex = /^\d+$/;

export const scoreTypes = {
  valid: {
    icon: "✅",
    label: "✅ Counts",
    scoreUpdate: { scoreValid: { increment: 1 } },
  },
  highest: {
    icon: "✨",
    label: "✨ Record",
    scoreUpdate: {
      scoreValid: { increment: 1 },
      scoreHighest: { increment: 1 },
    },
  },
  graced: {
    icon: "⌛",
    label: "⌛ Graced",
    scoreUpdate: { scoreGraced: { increment: 1 } },
  },
  invalid: {
    icon: "❌",
    label: "❌ Invalid",
    scoreUpdate: { scoreInvalid: { increment: 1 } },
  },
} as const;

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.inGuild()) return;
  if (!numberRegex.test(message.content)) return;

  const hasPerms = message.channel
    .permissionsFor(message.guild.members.me!)
    .has([
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.EmbedLinks,
    ]);
  if (!hasPerms) return;

  const guild = await prisma.guild.findUnique({
    where: { id: message.guildId },
  });
  if (message.channelId !== guild?.countingChannel) return;

  const member = await prisma.member.ensure(guild.id, message.author.id);

  const updateCount = async (count: number, memberId: string | null) => {
    await prisma.guild.update({
      where: { id: guild.id },
      data: {
        lastCount: count,
        lastCountMemberId: memberId,
        lastCountTimestamp: new Date(),

        ...(count > guild.highestCount && {
          highestCount: count,
          highestCountMemberId: message.author.id,
          highestCountTimestamp: new Date(),
        }),
      },
    });
  };

  const updateScore = async (
    scoreType: keyof typeof scoreTypes,
    count?: number,
  ) => {
    await message.react(scoreTypes[scoreType].icon);
    await prisma.member.update({
      where: {
        guildId_userId: {
          guildId: guild.id,
          userId: message.author.id,
        },
      },
      data: {
        ...scoreTypes[scoreType].scoreUpdate,

        ...(count && {
          lastCount: count,
          lastCountTimestamp: new Date(),

          ...(count > member.highestCount && {
            highestCount: count,
            highestCountTimestamp: new Date(),
          }),
        }),
      },
    });
  };

  const ruinCount = async (reason: string) => {
    const timeBetween = Date.now() - guild.lastCountTimestamp.getTime();
    if (timeBetween <= guild.graceMilliseconds) {
      await updateScore("graced");
      return;
    }

    await updateCount(0, null);
    await updateScore("invalid");

    await message.reply(
      `**${reason}** ${
        userMention(message.author.id)
      } ruined the count at **${guild.lastCount}**`,
    );
  };

  if (
    !guild.allowDoubleCounting && message.author.id === guild.lastCountMemberId
  ) {
    return await ruinCount("Double counted!");
  }

  const inputCount = parseInt(message.content, 10);
  const nextCount = guild.lastCount + 1;

  if (inputCount !== nextCount) {
    return await ruinCount("Wrong number!");
  }

  await updateCount(nextCount, message.author.id);
  await updateScore(
    nextCount > guild.highestCount ? "highest" : "valid",
    nextCount,
  );
});
