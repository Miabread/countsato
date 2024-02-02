import { SlashCommandBuilder, type CommandInteraction } from 'discord.js';

interface Command {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute(interaction: CommandInteraction): Promise<unknown>;
}

export const commands: Command[] = [];

await Promise.all([import('./channel'), import('./display')]);

commands.push({
    data: new SlashCommandBuilder().setName('ping').setDescription('test'),
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
});
