import { SlashCommandBuilder, EmbedBuilder, time } from 'discord.js';
import { commands } from '.';
import { prisma, timeSince } from '../util';
import { scoreTypes } from '../events/count';

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

        const formatDate = (date: Date) => time(Math.floor(date.getTime() / 1000), 'R');

        const description = [
            `**Last count:** ${data.lastActiveCount}`,
            formatDate(data.lastActiveTimestamp),
            `**Highest count:**  ${data.highestValidCount}`,
            formatDate(data.highestValidTimestamp),
        ];

        const { scoreValid, scoreHighest, scoreMercy, scoreInvalid } = data;
        const breakdownTotal = scoreValid + scoreHighest + scoreMercy + scoreInvalid;

        const formatScore = (score: number, top: number, bottom: number) =>
            `${score} (${((top / bottom) * 100).toFixed(2)}%)`;

        const header = ['Total Score', formatScore(scoreValid - scoreInvalid, scoreValid, scoreValid + scoreInvalid)];
        const fields = [
            [scoreTypes.valid.label, formatScore(scoreValid, scoreValid, breakdownTotal)],
            [scoreTypes.highest.label, formatScore(scoreHighest, scoreHighest, breakdownTotal)],
            [scoreTypes.mercied.label, formatScore(scoreMercy, scoreMercy, breakdownTotal)],
            [scoreTypes.invalid.label, formatScore(scoreInvalid, scoreInvalid, breakdownTotal)],
        ];

        const embed = baseEmbed
            .addFields(
                ...header.map((name, index) => ({
                    name,
                    value: fields.map((row) => row[index]).join('\n'),
                    inline: true,
                })),
            )
            .setDescription(description.join('\n'));

        await interaction.reply({ embeds: [embed] });
    },
});
