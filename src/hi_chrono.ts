import { REST, Routes } from 'discord.js';

const clientId = process.env.CLIENT_ID;
if (!clientId) throw new Error('CLIENT_ID not set in env');
const guildId = process.env.DEPLOY_GUILD_ID;
if (!guildId) throw new Error('DEPLOY_GUILD_ID not set in env');

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? '');

await rest.put(Routes.applicationGuildCommands(clientId, guildId) as any, {
    body: [],
});
