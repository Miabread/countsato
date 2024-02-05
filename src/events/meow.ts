import { Events, Sticker } from 'discord.js';
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

const meepRegex = /(m+e+e+p)/;

client.on(Events.ClientReady, () => {
    const guild = '873048649163239484';
    const sticker = client.guilds.cache.get(guild)?.stickers.cache.find((sticker) => sticker.name === 'illness imo');
    if (!sticker) return;

    client.on(Events.MessageCreate, async (message) => {
        if (message.guildId !== guild) return;
        if (!meepRegex.test(message.content)) return;
        await message.reply({ stickers: [sticker] });
    });
});
