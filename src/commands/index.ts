import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

interface Command {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute(interaction: ChatInputCommandInteraction): Promise<unknown>;
}

export const commands: Command[] = [];

await Promise.all([import('./stats'), import('./gamerule')]);

commands.push({
    data: new SlashCommandBuilder().setName('ping').setDescription('test'),
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
});
