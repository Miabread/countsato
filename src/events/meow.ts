import { Events } from 'discord.js';
import { client } from '..';
import { prisma } from '../util';

const meows = [
    {
        regex: /(m+(e+|r+)o+w+)|(n+y+a+)|(m+r+p+)/,
        reactions: ['🐱'],
    },
    // {
    //     regex: /me{2,}p/,
    //     reactions: ['<:illness:1185052052020281416>', '<:imo:1185052054054522910>'],
    //     guilds: ['873048649163239484'],
    // },
];

client.on(Events.MessageCreate, async (message) => {
    const meow = meows.findIndex((meow) => meow.regex.test(message.content));
    if (meow === -1) return;

    // if (meows[meow].guilds && !meows[meow].guilds?.includes(message.guildId ?? '')) return;

    if (message.inGuild()) {
        const data = await prisma.guild.findUnique({ where: { id: message.guildId } });
        if (!data?.meowReactions) return;
    }

    for (const reaction in meows[meow].reactions) {
        await message.react(reaction);
    }
});
