import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { commands } from '..';
import { prisma } from '../../util';
import { scoreTypes } from '../../events/count';
import { computeScoreFields, formatDate, formatScore } from '.';

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

        const description = [
            `**Last count:** ${data.lastActiveCount}`,
            formatDate(data.lastActiveTimestamp),
            `**Highest count:**  ${data.highestValidCount}`,
            formatDate(data.highestValidTimestamp),
        ];

        const embed = baseEmbed.setFields(computeScoreFields(data)).setDescription(description.join('\n'));

        await interaction.reply({ embeds: [embed] });
    },
});
