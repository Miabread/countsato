import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { commands } from '.';
import { prisma } from '../util';

const gamerules = {
    allow_double_counting: {
        description: 'If users are able to count with themselves',
        type: 'Boolean',
        field: 'allowDoubleCounting',
    },
    grace_milliseconds: {
        description: 'Amount of milliseconds after last valid count before invalid counts ruin the count',
        type: 'Integer',
        field: 'graceMilliseconds',
    },
    counting_channel: {
        description: 'The channel the bot listens for counting',
        type: 'Channel',
        field: 'countingChannel',
    },
} as const;

const data = new SlashCommandBuilder()
    .setName('gamerule')
    .setDescription("Edit this server's configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false);

for (const [key, gamerule] of Object.entries(gamerules)) {
    data.addSubcommand((sub) => {
        sub.setName(key).setDescription(gamerule.description);

        if (gamerule.type === 'Boolean') {
            sub.addBooleanOption((option) =>
                option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
            );
        } else if (gamerule.type === 'Integer') {
            sub.addIntegerOption((option) =>
                option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
            );
        } else if (gamerule.type === 'Channel') {
            sub.addChannelOption((option) =>
                option
                    .setName('value')
                    .setDescription('Leave blank to see current value')
                    .setRequired(false)
                    .addChannelTypes(ChannelType.GuildText),
            );
        }

        return sub;
    });
}

commands.push({
    data,

    async execute(interaction) {
        if (!interaction.inCachedGuild()) throw new Error('guild');

        const where = { id: interaction.guildId };
        const data = await prisma.guild.upsert({
            where,
            create: where,
            update: {},
        });

        const key = interaction.options.getSubcommand();
        const gamerule = gamerules[key as keyof typeof gamerules];
        if (!gamerule) throw new Error('gamerule');

        const value =
            gamerule.type === 'Boolean'
                ? interaction.options.getBoolean('value', false)
                : gamerule.type === 'Integer'
                ? interaction.options.getInteger('value', false)
                : gamerule.type === 'Channel'
                ? interaction.options.getChannel('value', false, [ChannelType.GuildText])?.id
                : null;

        if (value === null) {
            await interaction.reply(`Currently ${key} is ${data.allowDoubleCounting}`);
            return;
        }

        await prisma.guild.update({ where, data: { [gamerule.field]: value } });
        await interaction.reply(`Set ${key} to ${value}`);
    },
});
