import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    userMention,
} from 'discord.js';
import { commands } from '.';
import { prisma } from '../util';

const itemsPerPage = 10;

const boardTypes = {
    valid: {
        label: '✅ Counts',
        databaseKey: 'scoreValid',
        color: '#77b255',
    },
    highestEver: {
        label: '🏆 Highest Ever',
        databaseKey: 'highestCount',
        color: '#ffcc4d',
    },
    highest: {
        label: '✨ Counts in New Territory',
        databaseKey: 'scoreHighest',
        color: '#ffac33',
    },
    graced: {
        label: '⌛ Messages Graced',
        databaseKey: 'scoreGraced',
        color: '#3b88c3',
    },
    invalid: {
        label: '❌ Chains Ruined',
        databaseKey: 'scoreInvalid',
        color: '#dd2e44',
    },
} as const;

const backButtonId = 'back';
const nextButtonId = 'next';
const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(backButtonId).setLabel('<').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(nextButtonId).setLabel('>').setStyle(ButtonStyle.Secondary),
);
const selectMenuId = 'board';
const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('board')
    .setOptions(
        ...Object.entries(boardTypes).map(([id, data]) =>
            new StringSelectMenuOptionBuilder().setLabel(data.label).setValue(id),
        ),
    );
const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
const components = [buttonRow, selectRow];

commands.push({
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('View the top members in this server'),

    async execute(interaction) {
        if (!interaction.inCachedGuild()) throw new Error('guild');

        const embed = new EmbedBuilder();

        const memberCount = await prisma.member.count({ where: { guildId: interaction.guildId } });
        const maxPages = Math.ceil(memberCount / itemsPerPage);
        if (memberCount === 0) {
            embed.setDescription('No data to show! Get counting!');
            await interaction.reply({ embeds: [embed] });
            return;
        }

        let currentPage = 0;
        let currentBoardType: keyof typeof boardTypes = 'valid';

        const updatePageDisplay = async () => {
            const currentOffset = currentPage * itemsPerPage;
            const key = boardTypes[currentBoardType].databaseKey;

            const data = await prisma.member.findMany({
                where: { guildId: interaction.guildId },
                select: { userId: true, [key]: true },
                orderBy: { [key]: 'desc' },
                skip: currentOffset,
                take: itemsPerPage,
            });

            const display = data
                .map((member, index) => `#${index + currentOffset + 1} ${userMention(member.userId)} (${member[key]})`)
                .join('\n');

            embed.setTitle(boardTypes[currentBoardType].label);
            embed.setColor(boardTypes[currentBoardType].color);
            embed.setDescription(display);
            embed.setFooter({ text: `Page ${currentPage + 1} / ${maxPages}` });
        };

        await updatePageDisplay();
        const response = await interaction.reply({
            embeds: [embed],
            components,
        });

        const buttonCollector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60_000,
        });

        buttonCollector.on('collect', async (i) => {
            if (i.customId === backButtonId) {
                currentPage -= 1;
                if (currentPage < 0) currentPage = maxPages - 1;
            } else if (i.customId === nextButtonId) {
                currentPage += 1;
                if (currentPage >= maxPages) currentPage = 0;
            } else if (i.customId === selectMenuId) {
                if (!i.isStringSelectMenu()) throw new Error('string select menu');
                currentBoardType = i.values[0] as keyof typeof boardTypes;
            }

            await updatePageDisplay();
            i.update({ embeds: [embed] });
        });

        buttonCollector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    },
});
