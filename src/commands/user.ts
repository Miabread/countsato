import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { commands } from '.';
import { prisma } from '..';
import { icons } from '../events/count';

const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
];

const timeSince = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const interval = intervals.find((i) => i.seconds < seconds)!;
    const count = Math.floor(seconds / interval.seconds);
    return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
};

commands.push({
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('View the stats of a user')
        .setDMPermission(false)
        .addUserOption((option) => option.setName('user').setDescription('The user to view').setRequired(false)),

    async execute(interaction) {
        if (!interaction.inGuild()) throw new Error('Guild');

        const user = interaction.options.getUser('user', false) ?? interaction.user;

        const data = await prisma.member.upsert({
            where: {
                guildId_userId: {
                    guildId: interaction.guildId,
                    userId: user.id,
                },
            },
            create: {
                guild: {
                    connectOrCreate: {
                        where: {
                            id: interaction.guildId,
                        },
                        create: {
                            id: interaction.guildId,
                        },
                    },
                },
                user: {
                    connectOrCreate: {
                        where: {
                            id: user.id,
                        },
                        create: {
                            id: user.id,
                        },
                    },
                },
            },
            update: {},
        });

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
            [icons.valid + ' Valid']: formatScore(scoreValid, scoreValid, breakdownTotal),
            [icons.highest + ' Highest']: formatScore(scoreHighest, scoreHighest, breakdownTotal),
            [icons.mercied + ' Mercied']: formatScore(scoreMercy, scoreMercy, breakdownTotal),
            [icons.invalid + ' Ruined']: formatScore(scoreInvalid, scoreInvalid, breakdownTotal),
        };
        const lastActive = `Last active ${formatDate(data.lastActive)}`;
        const lastHighest = `Last highest ${formatDate(data.highestValidTimestamp)} (${data.highestValidCount})`;

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
