import { Events } from 'discord.js';
import { client } from '..';
import { prisma } from '../util';

const meows = [
    {
        regex: /(m+(e+|r+)o+w+)|(n+y+a+)|(m+r+p+)/,
        reactions: ['🐱'],
    },
];

client.on(Events.MessageCreate, async (message) => {
    const meow = meows.findIndex((meow) => meow.regex.test(message.content));
    if (meow === -1) return;

    if (message.inGuild()) {
        const data = await prisma.guild.findUnique({ where: { id: message.guildId } });
        if (!data?.meowReactions) return;
    }

    for (const reaction in meows[meow].reactions) {
        await message.react(reaction);
    }
});
