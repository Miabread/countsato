import { Events } from 'discord.js';
import { client, prisma } from '..';

const numberRegex = /^\d+$/;
const debugAllowDoubleCounts = true;
const mercyMs = 1000 * 3;

export const icons = {
    valid: '✅',
    highest: '✨',
    mercied: '⌛',
    invalid: '❌',
};

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    if (!numberRegex.test(message.content)) return;

    // Guild exisits and inside count channel
    const guild = await prisma.guild.findUnique({ where: { id: message.guildId } });
    if (message.channelId !== guild?.countChannelId) return;

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

    const ruinCount = async (reason: string) => {
        const timeBetween = message.createdTimestamp - guild.lastCountTimestamp.getTime();
        if (timeBetween <= mercyMs) {
            await message.react(icons.mercied);
            return;
        }

        updateCount(0, null);
        await message.react(icons.invalid);
        await message.channel.send(`**${reason}** Count ruined at **${guild.currentCount}**!`);
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
        await message.react(icons.highest);
    } else {
        await message.react(icons.valid);
    }
});
