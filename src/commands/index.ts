import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

interface Command {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
}

export const commands: Command[] = [];

await Promise.all([import('./stats'), import('./gamerule'), import('./ping')]);
