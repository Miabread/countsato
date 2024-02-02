import { time } from 'discord.js';
import { scoreTypes } from '../../events/count';

export const formatDate = (date: Date) => time(Math.floor(date.getTime() / 1000), 'R');

export const formatScore = (score: number, top: number, bottom: number) => {
    const percent = bottom === 0 ? 0 : (top / bottom) * 100;
    return `${score} (${percent.toFixed(2)}%)`;
};

interface Scores {
    scoreValid: number | null;
    scoreHighest: number | null;
    scoreMercy: number | null;
    scoreInvalid: number | null;
}

export const computeScoreFields = (scores: Scores) => {
    const scoreValid = scores.scoreValid ?? 0;
    const scoreHighest = scores.scoreHighest ?? 0;
    const scoreMercy = scores.scoreMercy ?? 0;
    const scoreInvalid = scores.scoreInvalid ?? 0;

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
