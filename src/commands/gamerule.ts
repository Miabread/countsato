import { ApplicationCommandOptionBase, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
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

const data = new SlashCommandBuilder()
    .setName('gamerule')
    .setDescription("Edit this server's configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false);

for (const [key, gamerule] of Object.entries(gamerules)) {
    data.addSubcommand((sub) =>
        sub
            .setName(key)
            .setDescription(gamerule.description)
            [`add${gamerule.type}Option` as const]((option: any) =>
                option.setName('value').setDescription('Leave blank to see current value').setRequired(false),
            ),
    );
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

        const value = interaction.options[`get${gamerule.type}`]('value', false);

        if (value === null) {
            await interaction.reply(`Currently ${key} is ${data.allowDoubleCounting}`);
            return;
        }

        await prisma.guild.update({ where, data: { [gamerule.field]: value } });
        await interaction.reply(`Set ${key} to ${value}`);
    },
});
