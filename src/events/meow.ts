import { Events } from 'discord.js';
import { client } from '..';
import { prisma } from '../util';

const meowRegex = /(m+(e+|r+)o+w+)|(n+y+a+)|(m+r+p+)/;

client.on(Events.MessageCreate, async (message) => {
    if (!meowRegex.test(message.content)) return;

    if (message.inGuild()) {
        const data = await prisma.guild.findUnique({ where: { id: message.guildId } });
        if (!data?.meowReactions) return;
    }

    await message.react('🐱');
});
