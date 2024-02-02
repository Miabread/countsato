import { EmbedBuilder, SlashCommandBuilder, userMention } from 'discord.js';
import { commands } from '..';
import { prisma } from '../../util';
import { computeScoreFields, formatDate } from '.';

commands.push({
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('View the stats of the current server')
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.inCachedGuild()) throw new Error('Guild');

        const baseEmbed = new EmbedBuilder()
            .setTitle(interaction.guild.name)
            .setThumbnail(interaction.guild.iconURL())
            .setColor(interaction.guild.members.me?.displayColor ?? null);

        const data = await prisma.guild.findUnique({ where: { id: interaction.guildId } });

        if (!data) {
            const embed = baseEmbed.setDescription("This server hasn't counted yet! Get started!");
            await interaction.reply({ embeds: [embed] });
            return;
        }

        const description = [
            `**Current count:** ${data.currentCount}`,
            `${userMention(data.lastCountMemberId!)} ${formatDate(data.lastCountTimestamp)}`,
            `**Highest count:** ${data.highestCount}`,
            `${userMention(data.highestCountMemberId!)} ${formatDate(data.highestCountTimestamp)}`,
        ];

        const scores = await prisma.member.aggregate({
            where: { guildId: interaction.guildId },
            _sum: {
                scoreValid: true,
                scoreHighest: true,
                scoreMercy: true,
                scoreInvalid: true,
            },
        });

        const embed = baseEmbed.setFields(computeScoreFields(scores._sum)).setDescription(description.join('\n'));
        await interaction.reply({ embeds: [embed] });
    },
});
