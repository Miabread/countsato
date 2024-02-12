import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.ts";

import { load } from "https://deno.land/std@0.215.0/dotenv/mod.ts";
const env = await load();

const clientId = env["CLIENT_ID"];
if (!clientId) throw new Error("CLIENT_ID not set in env");
const guildId = env["DEPLOY_GUILD_ID"];
if (!guildId) throw new Error("DEPLOY_GUILD_ID not set in env");

const routes: Record<string, string | undefined> = {
  global: Routes.applicationCommands(clientId),
  guild: Routes.applicationGuildCommands(clientId, guildId),
};

const route = routes[Deno.args[2]];
if (!route) throw new Error("Subcommand must be `global` or `guild`");

const rest = new REST().setToken(env["DISCORD_TOKEN"] ?? "");

await rest.put(route as any, {
  body: commands.map((command) => command.data.toJSON()),
});
