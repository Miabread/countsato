import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.ts";

import { load } from "https://deno.land/std@0.215.0/dotenv/mod.ts";
const env = await load();

const clientId = env["CLIENT_ID"];
if (!clientId) throw new Error("CLIENT_ID not set in env");
const guildId = env["DEPLOY_GUILD_ID"];
if (!guildId) throw new Error("DEPLOY_GUILD_ID not set in env");

const options = {
  global: {
    route: Routes.applicationCommands(clientId),
    commands: commands.filter((command) => !command.private),
  },
  guild: {
    route: Routes.applicationGuildCommands(clientId, guildId),
    commands,
  },
} as const;

const option = options[Bun.argv[2] as keyof typeof options];
if (!option) throw new Error("Subcommand must be `global` or `guild`");

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "");

console.log(`Deploying ${commands.length} commands`);

await rest.put(option.route, {
  body: option.commands.map((command) => command.data.toJSON()),
});
