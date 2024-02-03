import { EmbedBuilder, SlashCommandBuilder, time, userMention } from 'discord.js';
import { scoreTypes } from '../events/count';
import { commands } from '.';
import { prisma } from '../util';

interface DisplayProps {
    baseEmbed: EmbedBuilder;

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

export const createDisplay = (props: DisplayProps) => {
    const body = [
        ['Last count', props.lastCount, props.lastCountMemberId, props.lastCountTimestamp],
        ['Highest count', props.highestCount, props.highestCountMemberId, props.highestCountTimestamp],
    ] as const;

    const scoreValid = props.scoreValid ?? 0;
    const scoreHighest = props.scoreHighest ?? 0;
    const scoreGraced = props.scoreGraced ?? 0;
    const scoreInvalid = props.scoreInvalid ?? 0;

    const breakdownTotal = scoreValid + scoreHighest + scoreGraced + scoreInvalid;

    const header = ['Total Score', formatScore(scoreValid - scoreInvalid, scoreValid, scoreValid + scoreInvalid)];
    const rows = [
        [scoreTypes.valid.label, formatScore(scoreValid, scoreValid - scoreHighest, breakdownTotal)],
        [scoreTypes.highest.label, formatScore(scoreHighest, scoreHighest, breakdownTotal)],
        [scoreTypes.graced.label, formatScore(scoreGraced, scoreGraced, breakdownTotal)],
        [scoreTypes.invalid.label, formatScore(scoreInvalid, scoreInvalid, breakdownTotal)],
    ];

    return props.baseEmbed
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
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.inCachedGuild()) throw new Error('guild');

        if (interaction.options.getSubcommand() === 'server') {
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
                    scoreGraced: true,
                    scoreInvalid: true,
                },
            });

            const embed = createDisplay({ baseEmbed, ...data, ...scores._sum });
            await interaction.reply({ embeds: [embed] });
        } else if (interaction.options.getSubcommand() === 'member') {
            const user = interaction.options.getUser('member', false) ?? interaction.user;

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

            const embed = createDisplay({ baseEmbed, ...data }).setFooter({
                text: interaction.guild.name,
                iconURL: interaction.guild.iconURL() ?? undefined,
            });
            await interaction.reply({ embeds: [embed] });
        }
    },
});
