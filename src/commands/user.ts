import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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

        const data = await prisma.member.ensure(interaction.guildId, user.id);

        const member = interaction.guild?.members.cache.get(user.id);
        const name = member?.nickname ?? user.displayName;
        const avatar = member?.avatarURL() ?? user.avatarURL();
        const color = member?.displayColor ?? null;

        const { scoreValid, scoreHighest, scoreMercy, scoreInvalid } = data;
        const breakdownTotal = scoreValid + scoreHighest + scoreMercy + scoreInvalid;

        const formatScore = (score: number, top: number, bottom: number) =>
            `${score} (${((top / bottom) * 100).toFixed(2)}%)`;
        const formatDate = (date: Date | null) => (date ? timeSince(date) : 'never');

        const totalScore = formatScore(scoreValid - scoreInvalid, scoreValid, scoreValid + scoreInvalid);
        const scores = {
            [scoreTypes.valid.label]: formatScore(scoreValid, scoreValid, breakdownTotal),
            [scoreTypes.highest.label]: formatScore(scoreHighest, scoreHighest, breakdownTotal),
            [scoreTypes.mercied.label]: formatScore(scoreMercy, scoreMercy, breakdownTotal),
            [scoreTypes.invalid.label]: formatScore(scoreInvalid, scoreInvalid, breakdownTotal),
        };
        const lastActive = `Active ${formatDate(data.lastActive)}`;
        const lastHighest = `Highest ${formatDate(data.highestValidTimestamp)} (${data.highestValidCount})`;

        const embed = new EmbedBuilder()
            .setTitle(name)
            .setThumbnail(avatar)
            .setColor(color)
            .addFields(
                { name: 'Total Score', value: Object.keys(scores).join('\n'), inline: true },
                { name: totalScore, value: Object.values(scores).join('\n'), inline: true },
            )
            .setFooter({
                text: `${lastActive}\n${lastHighest}`,
            });

        await interaction.reply({ embeds: [embed] });
    },
});
