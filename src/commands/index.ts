import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

interface Command {
  private?: boolean;
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
}

export const commands: Command[] = [];

await Promise.all([
  import("./stats"),
  import("./gamerule"),
  import("./ping"),
  import("./leaderboard"),
  import("./roll"),
  import("./dev"),
]);
