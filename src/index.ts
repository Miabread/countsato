import { Client, Events, GatewayIntentBits } from 'discord.js';

export const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag} for ${client.guilds.cache.size} guilds`);
    client.user.setActivity(process.env.CLIENT_ACTIVITY ?? '');
});

await import('./events');

if (import.meta.main) {
    await client.login(process.env.DISCORD_TOKEN);
}
