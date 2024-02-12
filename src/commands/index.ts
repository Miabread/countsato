import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

interface Command {
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
}

await Promise.all([
  import("./stats.ts"),
  import("./gamerule.ts"),
  import("./ping.ts"),
]);

export const commands: Command[] = [];
