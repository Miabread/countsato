import { EmbedBuilder, SlashCommandBuilder, time, userMention } from 'discord.js';
import { scoreTypes } from '../events/count';
import { commands } from '.';
import { prisma } from '../util';

interface DisplayProps {
    lastCount: number;
    lastCountMemberId?: string | null;
    lastCountTimestamp: Date;

    highestCount: number;
    highestCountMemberId?: string | null;
    highestCountTimestamp: Date;

    scoreValid: number | null;
    scoreHighest: number | null;
    scoreGraced: number | null;
    scoreInvalid: number | null;
}

const formatUser = (userId?: string | null) => {
    if (!userId) return '';
    return userMention(userId);
};

const formatDate = (date: Date) => time(Math.floor(date.getTime() / 1000), 'R');

const formatScore = (score: number, top: number, bottom: number) => {
    const percent = bottom === 0 ? 0 : (top / bottom) * 100;
    return `${score} (${percent.toFixed(2)}%)`;
};

export const createDisplay = (embed: EmbedBuilder, props: DisplayProps) => {
    const body = [
        ['Last Count', props.lastCount, props.lastCountMemberId, props.lastCountTimestamp],
        ['Highest Count', props.highestCount, props.highestCountMemberId, props.highestCountTimestamp],
    ] as const;

    const scoreValid = props.scoreValid ?? 0;
    const scoreHighest = props.scoreHighest ?? 0;
    const scoreGraced = props.scoreGraced ?? 0;
    const scoreInvalid = props.scoreInvalid ?? 0;

    // Don't include scoreHighest in this, because scoreValid already considers those
    const breakdownTotal = scoreValid + scoreGraced + scoreInvalid;

    const header = ['Total Score', formatScore(scoreValid - scoreInvalid, scoreValid, scoreValid + scoreInvalid)];
    const rows = [
        [scoreTypes.valid.label, formatScore(scoreValid, scoreValid - scoreHighest, breakdownTotal)],
        [scoreTypes.highest.label, formatScore(scoreHighest, scoreHighest, breakdownTotal)],
        [scoreTypes.graced.label, formatScore(scoreGraced, scoreGraced, breakdownTotal)],
        [scoreTypes.invalid.label, formatScore(scoreInvalid, scoreInvalid, breakdownTotal)],
    ];

    embed
        .addFields(
            ...body.map(([label, count, member, time]) => ({
                name: `**${label}: ${count}**`,
                value: `${formatUser(member)} ${formatDate(time)}`,
            })),
        )
        .addFields(
            ...header.map((name, index) => ({
                name,
                value: rows.map((row) => row[index]).join('\n'),
                inline: true,
            })),
        );
};

commands.push({
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('hi')
        .addSubcommand((sub) =>
            sub
                .setName('member')
                .setDescription('View the stats of a server member')
                .addUserOption((option) => option.setName('member').setDescription('The member to view')),
        )
        .addSubcommand((sub) => sub.setName('server').setDescription('View the stats of this server'))
        .addSubcommand((sub) =>
            sub
                .setName('user')
                .setDescription('View the global stats of a user')
                .addUserOption((option) => option.setName('user').setDescription('The user to view')),
        )
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.inCachedGuild()) throw new Error('guild');

        if (interaction.options.getSubcommand() === 'server') {
            const embed = new EmbedBuilder()
                .setTitle(interaction.guild.name)
                .setThumbnail(interaction.guild.iconURL())
                .setColor(interaction.guild.members.me?.displayColor ?? null);

            const data = await prisma.guild.findUnique({ where: { id: interaction.guildId } });

            if (!data) {
                embed.setDescription("This server hasn't counted yet! Get started!");
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const scores = await prisma.member.aggregate({
                where: { guildId: interaction.guildId },
                _sum: {
                    scoreValid: true,
                    scoreHighest: true,
                    scoreGraced: true,
                    scoreInvalid: true,
                },
            });

            createDisplay(embed, { ...data, ...scores._sum });
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.options.getSubcommand() === 'member') {
            const user = interaction.options.getUser('member', false) ?? interaction.user;

            const member = interaction.guild?.members.cache.get(user.id);
            const embed = new EmbedBuilder()
                .setTitle(member?.nickname ?? user.displayName)
                .setThumbnail(member?.avatarURL() ?? user.avatarURL())
                .setColor(member?.displayColor ?? user.accentColor ?? null)
                .setFooter({
                    text: interaction.guild.name,
                    iconURL: interaction.guild.iconURL() ?? undefined,
                });

            const data = await prisma.member.findUnique({
                where: {
                    guildId_userId: {
                        guildId: interaction.guildId,
                        userId: user.id,
                    },
                },
            });

            if (!data) {
                embed.setDescription(user.bot ? "Computers can't do math, silly." : "This user hasn't counted yet.");
                await interaction.reply({ embeds: [embed] });
                return;
            }

            createDisplay(embed, { ...data });
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.options.getSubcommand() === 'user') {
            const user = interaction.options.getUser('user', false) ?? interaction.user;

            const embed = new EmbedBuilder()
                .setTitle(user.displayName)
                .setThumbnail(user.avatarURL())
                .setColor(user.accentColor ?? null)
                .setFooter({
                    text: 'Global',
                    iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
                });

            const lastCount = await prisma.member.findFirst({
                where: { userId: user.id },
                orderBy: { highestCount: 'desc' },
                select: { highestCount: true, highestCountTimestamp: true },
                take: 1,
            });

            const highestCount = await prisma.member.findFirst({
                where: { userId: user.id },
                orderBy: { lastCountTimestamp: 'desc' },
                select: { lastCount: true, lastCountTimestamp: true },
                take: 1,
            });

            if (!lastCount || !highestCount) {
                embed.setDescription(user.bot ? "Computers can't do math, silly." : "This user hasn't counted yet.");
                await interaction.reply({ embeds: [embed] });
                return;
            }

            const scores = await prisma.member.aggregate({
                where: { userId: user.id },
                _sum: {
                    scoreValid: true,
                    scoreHighest: true,
                    scoreGraced: true,
                    scoreInvalid: true,
                },
            });

            createDisplay(embed, { ...lastCount, ...highestCount, ...scores._sum });
            await interaction.reply({ embeds: [embed] });
        }
    },
});
