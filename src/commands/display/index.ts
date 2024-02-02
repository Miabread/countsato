import { EmbedBuilder, time, userMention } from 'discord.js';
import { scoreTypes } from '../../events/count';

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
    scoreSpared: number | null;
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
    const description = [
        `**Last count: ${props.lastCount}**`,
        `${formatUser(props.lastCountMemberId)} ${formatDate(props.lastCountTimestamp)}`,
        `**Highest count: ${props.highestCount}**`,
        `${formatUser(props.highestCountMemberId)} ${formatDate(props.highestCountTimestamp)}`,
    ];

    const scoreValid = props.scoreValid ?? 0;
    const scoreHighest = props.scoreHighest ?? 0;
    const scoreSpared = props.scoreSpared ?? 0;
    const scoreInvalid = props.scoreInvalid ?? 0;

    const breakdownTotal = scoreValid + scoreHighest + scoreSpared + scoreInvalid;

    const header = ['Total Score', formatScore(scoreValid - scoreInvalid, scoreValid, scoreValid + scoreInvalid)];
    const rows = [
        [scoreTypes.valid.label, formatScore(scoreValid, scoreValid, breakdownTotal)],
        [scoreTypes.highest.label, formatScore(scoreHighest, scoreHighest, breakdownTotal)],
        [scoreTypes.spared.label, formatScore(scoreSpared, scoreSpared, breakdownTotal)],
        [scoreTypes.invalid.label, formatScore(scoreInvalid, scoreInvalid, breakdownTotal)],
    ];

    return props.baseEmbed
        .setFields(
            header.map((name, index) => ({
                name,
                value: rows.map((row) => row[index]).join('\n'),
                inline: true,
            })),
        )
        .setDescription(description.join('\n'));
};

import './user';
import './server';
