import { time } from 'discord.js';
import { scoreTypes } from '../../events/count';

export const formatDate = (date: Date) => time(Math.floor(date.getTime() / 1000), 'R');

export const formatScore = (score: number, top: number, bottom: number) =>
    `${score} (${((top / bottom) * 100).toFixed(2)}%)`;

export const computeScoreFields = (
    scoreValid: number,
    scoreHighest: number,
    scoreMercy: number,
    scoreInvalid: number,
) => {
    const breakdownTotal = scoreValid + scoreHighest + scoreMercy + scoreInvalid;

    const header = ['Total Score', formatScore(scoreValid - scoreInvalid, scoreValid, scoreValid + scoreInvalid)];
    const rows = [
        [scoreTypes.valid.label, formatScore(scoreValid, scoreValid, breakdownTotal)],
        [scoreTypes.highest.label, formatScore(scoreHighest, scoreHighest, breakdownTotal)],
        [scoreTypes.mercied.label, formatScore(scoreMercy, scoreMercy, breakdownTotal)],
        [scoreTypes.invalid.label, formatScore(scoreInvalid, scoreInvalid, breakdownTotal)],
    ];

    return header.map((name, index) => ({
        name,
        value: rows.map((row) => row[index]).join('\n'),
        inline: true,
    }));
};

import './user';
import './server';
