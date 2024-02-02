import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { commands } from '..';
import { prisma } from '../../util';
import { createDisplay } from '.';

commands.push({
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('View the stats of a user')
        .setDMPermission(false)
        .addUserOption((option) => option.setName('user').setDescription('The user to view').setRequired(false)),

    async execute(interaction) {
        if (!interaction.inGuild()) throw new Error('Guild');

        const user = interaction.options.getUser('user', false) ?? interaction.user;

        const member = interaction.guild?.members.cache.get(user.id);
        const baseEmbed = new EmbedBuilder()
            .setTitle(member?.nickname ?? user.displayName)
            .setThumbnail(member?.avatarURL() ?? user.avatarURL())
            .setColor(member?.displayColor ?? null);

        const data = await prisma.member.findUnique({
            where: {
                guildId_userId: {
                    guildId: interaction.guildId,
                    userId: user.id,
                },
            },
        });

        if (!data) {
            const embed = baseEmbed.setDescription(
                user.bot ? "Computers can't do math, silly." : "This user hasn't counted yet.",
            );
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const embed = createDisplay({
            ...data,
            baseEmbed,
            lastCount: data.lastActiveCount,
            lastCountTimestamp: data.lastActiveTimestamp,
            highestCount: data.highestValidCount,
            highestCountTimestamp: data.highestValidTimestamp,
        });

        await interaction.reply({ embeds: [embed] });
    },
});
