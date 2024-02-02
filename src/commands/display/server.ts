import { EmbedBuilder, SlashCommandBuilder, userMention } from 'discord.js';
import { commands } from '..';
import { prisma } from '../../util';
import { createDisplay } from '.';

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

        const scores = await prisma.member.aggregate({
            where: { guildId: interaction.guildId },
            _sum: {
                scoreValid: true,
                scoreHighest: true,
                scoreMercy: true,
                scoreInvalid: true,
            },
        });

        const embed = createDisplay({ baseEmbed, ...data, ...scores._sum });
        await interaction.reply({ embeds: [embed] });
    },
});
