import { SlashCommandBuilder, PermissionFlagsBits, channelMention } from 'discord.js';
import { commands } from '.';
import { prisma } from '..';

commands.push({
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Register the counting channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.inGuild()) throw new Error('Guild');

        await prisma.guild.upsert({
            where: {
                id: interaction.guildId,
            },
            create: {
                id: interaction.guildId,
                countChannelId: interaction.channelId,
            },
            update: {
                countChannelId: interaction.channelId,
            },
        });

        await interaction.reply(`Set counting channel to ${channelMention(interaction.channelId)}`);
    },
});
