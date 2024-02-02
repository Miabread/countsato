import { Events } from 'discord.js';
import { client } from '..';
import { prisma } from '../util';

const numberRegex = /^\d+$/;
const debugAllowDoubleCounts = true;
const mercyMs = 1000 * 3;

export const scoreTypes = {
    valid: {
        icon: '✅',
        label: '✅ Valid',
        scoreUpdate: { scoreValid: { increment: 1 } },
    },
    highest: {
        icon: '✨',
        label: '✨ Highest',
        scoreUpdate: { scoreValid: { increment: 1 }, scoreHighest: { increment: 1 } },
    },
    mercied: {
        icon: '⌛',
        label: '⌛ Mercied',
        scoreUpdate: { scoreMercy: { increment: 1 } },
    },
    invalid: {
        icon: '❌',
        label: '❌ Ruined',
        scoreUpdate: { scoreInvalid: { increment: 1 } },
    },
} as const;

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    if (!numberRegex.test(message.content)) return;

    // Guild exisits and inside count channel
    const guild = await prisma.guild.findUnique({ where: { id: message.guildId } });
    if (message.channelId !== guild?.countChannelId) return;

    prisma.member.ensure(guild.id, message.author.id);

    const updateCount = async (count: number, memberId: string | null) => {
        await prisma.guild.update({
            where: { id: guild.id },
            data: {
                currentCount: count,
                lastCountMemberId: memberId,
                lastCountTimestamp: message.createdAt,
            },
        });
    };

    const updateScore = async (scoreType: keyof typeof scoreTypes) => {
        await message.react(scoreTypes[scoreType].icon);
        await prisma.member.update({
            where: {
                guildId_userId: {
                    guildId: guild.id,
                    userId: message.author.id,
                },
            },
            data: scoreTypes[scoreType].scoreUpdate,
        });
    };

    const ruinCount = async (reason: string) => {
        const timeBetween = message.createdTimestamp - guild.lastCountTimestamp.getTime();
        if (timeBetween <= mercyMs) {
            await updateScore('mercied');
            return;
        }

        updateCount(0, null);
        await message.channel.send(`**${reason}** Count ruined at **${guild.currentCount}**!`);
        await updateScore('invalid');
    };

    if (!debugAllowDoubleCounts && message.author.id === guild.lastCountMemberId) {
        return await ruinCount('Double counted!');
    }

    const inputCount = parseInt(message.content, 10);
    const nextCount = guild.currentCount + 1;

    if (inputCount !== nextCount) {
        return await ruinCount('Wrong number!');
    }

    updateCount(nextCount, message.author.id);

    if (nextCount > guild.highestCount) {
        await prisma.guild.update({
            where: { id: guild.id },
            data: {
                highestCount: nextCount,
            },
        });
        await updateScore('highest');
    } else {
        await updateScore('valid');
    }
});
