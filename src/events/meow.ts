import { Events } from 'discord.js';
import { client } from '..';

const meowRegex = /(m+(e+|r+)o+w+)|(n+y+a+)|(m+r+p+)/;
const meowGuilds = process.env.MEOW_GUILDS?.split(',') ?? [];

client.on(Events.MessageCreate, async (message) => {
    if (message.inGuild() && !meowGuilds.includes(message.guildId)) return;
    if (!meowRegex.test(message.content)) return;
    await message.react('🐱');
});
