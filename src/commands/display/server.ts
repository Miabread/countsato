import { EmbedBuilder, SlashCommandBuilder, time, userMention } from 'discord.js';
import { commands } from '..';
import { prisma } from '../../util';

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

        const formatDate = (date: Date) => time(Math.floor(date.getTime() / 1000), 'R');

        const description = [
            `**Current count:** ${data.currentCount}`,
            `${userMention(data.lastCountMemberId!)} ${formatDate(data.lastCountTimestamp)}`,
            `**Highest count:** ${data.highestCount}`,
            `${userMention(data.highestCountMemberId!)} ${formatDate(data.highestCountTimestamp)}`,
        ];

        const embed = baseEmbed.setDescription(description.join('\n'));
        await interaction.reply({ embeds: [embed] });
    },
});
