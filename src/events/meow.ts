import { Events } from 'discord.js';
import { client } from '..';

const meowRegex = /(m+(e+|r+)o+w+)|(n+y+a+)|(m+r+p+)/;

client.on(Events.MessageCreate, async (message) => {
    return;
    if (!meowRegex.test(message.content)) return;
    await message.react('🐱');
});
