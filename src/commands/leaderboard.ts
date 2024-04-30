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

const categories = {
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
const paginationRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
    new ButtonBuilder().setCustomId(backButtonId).setLabel('<').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(nextButtonId).setLabel('>').setStyle(ButtonStyle.Primary),
);
const categoryRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
    Object.entries(categories).map(([id, data]) =>
        new ButtonBuilder().setCustomId(id).setLabel(data.label.split(' ')[0]).setStyle(ButtonStyle.Secondary),
    ),
);
const components = [paginationRow, categoryRow];

commands.push({
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the top members in this server')
        .addStringOption((option) =>
            option
                .setName('category')
                .setDescription('Select which leaderboard to view')
                .setChoices(...Object.entries(categories).map(([value, data]) => ({ name: data.label, value }))),
        ),

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
        let currentCategory = (interaction.options.getString('category', false) as keyof typeof categories) ?? 'valid';

        const updatePageDisplay = async () => {
            const currentOffset = currentPage * itemsPerPage;
            const category = categories[currentCategory];

            const data = await prisma.member.findMany({
                where: { guildId: interaction.guildId },
                select: { userId: true, [category.databaseKey]: true },
                orderBy: { [category.databaseKey]: 'desc' },
                skip: currentOffset,
                take: itemsPerPage,
            });

            const display = data.map((member, index) => {
                const ranking = index + currentOffset + 1;
                const value = member[category.databaseKey];
                return `#${ranking} ${userMention(member.userId)} (${value})`;
            });

            embed
                .setTitle(category.label)
                .setColor(category.color)
                .setDescription(display.join('\n'))
                .setFooter({ text: `Page ${currentPage + 1} / ${maxPages}` });
            return [embed];
        };

        const response = await interaction.reply({
            embeds: await updatePageDisplay(),
            components,
        });

        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60_000,
        });

        collector.on('collect', async (i) => {
            if (i.customId === backButtonId) {
                currentPage -= 1;
                if (currentPage < 0) currentPage = maxPages - 1;
            } else if (i.customId === nextButtonId) {
                currentPage += 1;
                if (currentPage >= maxPages) currentPage = 0;
            } else if (Object.hasOwn(categories, i.customId)) {
                currentCategory = i.customId as keyof typeof categories;
            }

            i.update({ embeds: await updatePageDisplay() });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] });
        });
    },
});
