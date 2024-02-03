import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { commands } from '.';
import { prisma } from '../util';

const gamerules = {
    allow_double_counting: {
        description: 'If users are able to count with themselves',
        type: 'Boolean',
        field: 'allowDoubleCounting',
    },
    grace_milliseconds: {
        description: 'grace_milliseconds',
        type: 'Integer',
        field: 'graceMilliseconds',
    },
} as const;

commands.push({
    data: new SlashCommandBuilder()
        .setName('gamerule')
        .setDescription("Edit this server's configuration")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('allow_double_counting')
                .setDescription('If users are able to count with themselves')
                .addBooleanOption((option) =>
                    option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('grace_milliseconds')
                .setDescription('Amount of milliseconds after last valid count before invalid counts ruin the count')
                .addIntegerOption((option) =>
                    option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
                ),
        )
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.inCachedGuild()) throw new Error('guild');

        const where = { id: interaction.guildId };
        const data = await prisma.guild.upsert({
            where,
            create: where,
            update: {},
        });

        if (interaction.options.getSubcommand() === 'allow_double_counting') {
            const value = interaction.options.getBoolean('value', false);

            if (value === null) {
                await interaction.reply(`Currently allow_double_counting is ${data.allowDoubleCounting}`);
                return;
            }

            await prisma.guild.update({ where, data: { allowDoubleCounting: value } });
            await interaction.reply(`Set allow_double_counting to ${value}`);
        } else if (interaction.options.getSubcommand() === 'grace_milliseconds') {
            const value = interaction.options.getInteger('value', false);

            if (value === null) {
                await interaction.reply(`Currently grace_milliseconds is ${data.graceMilliseconds}`);
                return;
            }

            await prisma.guild.update({ where, data: { graceMilliseconds: value } });
            await interaction.reply(`Set grace_milliseconds to ${value}`);
        }
    },
});
