import { REST, Routes } from 'discord.js';
import { commands } from './commands';

await new REST()
    .setToken(process.env.DISCORD_TOKEN ?? '')
    .put(Routes.applicationGuildCommands(process.env.CLIENT_ID ?? '', process.env.DEV_GUILD_ID ?? ''), {
        body: commands.map((command) => command.data.toJSON()),
    });
