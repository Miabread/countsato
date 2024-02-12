import { Client, Events, GatewayIntentBits } from "discord.js";

import { load } from "https://deno.land/std@0.215.0/dotenv/mod.ts";
const env = await load();

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (client) => {
  console.log(
    `Ready! Logged in as ${client.user.tag} for ${client.guilds.cache.size} guilds`,
  );
  client.user.setActivity(env["CLIENT_ACTIVITY"] ?? "");
});

await import("./events/index.ts");

if (import.meta.main) {
  await client.login(env["DISCORD_TOKEN"]);
}
