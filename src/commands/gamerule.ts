import {
    ChannelType,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    channelMention,
} from 'discord.js';
import { commands } from '.';
import { prisma } from '../util';

interface Gamerule<T> {
    addOption(sub: SlashCommandSubcommandBuilder): void;
    readOption(interaction: ChatInputCommandInteraction<'cached'>): T | null;
    display(value: T): string;
}

const Boolean: Gamerule<boolean> = {
    addOption(sub) {
        sub.addBooleanOption((option) =>
            option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
        );
    },
    readOption(interaction) {
        return interaction.options.getBoolean('value', false);
    },
    display(value) {
        return value ? 'True' : 'False';
    },
};

const Integer: Gamerule<number> = {
    addOption(sub) {
        sub.addNumberOption((option) =>
            option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
        );
    },
    readOption(interaction) {
        return interaction.options.getNumber('value', false);
    },
    display(value) {
        return value.toString();
    },
};

const TextChannel: Gamerule<string> = {
    addOption(sub) {
        sub.addChannelOption((option) =>
            option
                .setName('value')
                .setDescription('Leave blank to see current value')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText),
        );
    },
    readOption(interaction) {
        const value = interaction.options.getChannel('value', false, [ChannelType.GuildText]);
        if (value === null) return null;
        return value.id;
    },
    display(value) {
        return channelMention(value);
    },
};

const gamerules = {
    allow_double_counting: {
        description: 'If users are able to count with themselves',
        type: Boolean,
        field: 'allowDoubleCounting',
    },
    grace_milliseconds: {
        description: 'Amount of milliseconds after last valid count before invalid counts ruin the count',
        type: Integer,
        field: 'graceMilliseconds',
    },
    counting_channel: {
        description: 'The channel the bot listens for counting',
        type: TextChannel,
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
        gamerule.type.addOption(sub);
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

        const value = gamerule.type.readOption(interaction);
        if (value === null) {
            await interaction.reply(`Currently ${key} is ${gamerule.type.display(data[gamerule.field] as never)}`);
            return;
        }

        await prisma.guild.update({ where, data: { [gamerule.field]: value } });
        await interaction.reply(`Set ${key} to ${gamerule.type.display(value as never)}`);
    },
});
