import { SlashCommandBuilder } from 'discord.js';
import { commands } from '.';

commands.push({
    private: true,

    data: new SlashCommandBuilder()
        .setName('dev')
        .setDescription('Commands used for development')
        .addSubcommandGroup((group) =>
            group
                .setName('deploy')
                .setDescription('Deploy commands')
                .addSubcommand((sub) => sub.setName('global').setDescription('Deploy all commands globally'))
                .addSubcommand((sub) =>
                    sub
                        .setName('guild')
                        .setDescription('Deploy all commands to a guild')
                        .addStringOption((option) =>
                            option.setRequired(true).setName('guild-id').setDescription('Guild to deploy commands to'),
                        )
                        .addBooleanOption((option) =>
                            option
                                .setRequired(false)
                                .setName('private')
                                .setDescription('Should private commands be deployed'),
                        ),
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('remove')
                        .setDescription('Remove commands from deployment')
                        .addStringOption((option) =>
                            option
                                .setRequired(false)
                                .setName('guild-id')
                                .setDescription('If present, remove from a guild instead of globally'),
                        )
                        .addStringOption((option) =>
                            option
                                .setRequired(false)
                                .setName('command-id')
                                .setDescription('If present, remove a specific command instead of all commands'),
                        ),
                ),
        ) as any,
    // .addSubcommandGroup((group) =>
    //     group
    //         .setName('wipe')
    //         .setDescription('Delete an entity from the database')
    //         .addSubcommand((sub) => sub.setName('guild'))
    //         .addSubcommand((sub) => sub.setName('member'))
    //         .addSubcommand((sub) => sub.setName('user')),
    // ) as any,

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup(true);
        const subcommand = interaction.options.getSubcommand(true);

        if (subcommandGroup === 'deploy') {
            if (subcommand === 'global') {
                const publicCommands = commands.filter((command) => !command.private).map((command) => command.data);
                await interaction.reply(`Deploying ${publicCommands.length} commands globally...`);
                await interaction.client.application.commands.set(publicCommands);
                await interaction.editReply(`Global deployment of ${publicCommands.length} commands successful!`);
            } else if (subcommand === 'guild') {
                const guildId = interaction.options.getString('guild-id', true).trim();

                const guild = interaction.client.guilds.cache.get(guildId);
                if (!guild) {
                    await interaction.reply('Guild not found in client cache');
                    return;
                }

                const publicCommands = commands.filter((command) => !command.private).map((command) => command.data);
                const privateCommands = commands.filter((command) => command.private).map((command) => command.data);

                const shouldDeployPrivate = interaction.options.getBoolean('private') ?? false;
                const privateFragment = shouldDeployPrivate ? ` and ${privateCommands.length} private commands` : '';
                const messageFragment = `${publicCommands.length} commands${privateFragment} to guild "${guild.name}"`;

                await interaction.reply(`Deploying ${messageFragment} ...`);
                await interaction.client.application.commands.set(
                    shouldDeployPrivate ? publicCommands.concat(privateCommands) : publicCommands,
                    guild.id,
                );
                await interaction.editReply(`Deployment of ${messageFragment} successful!`);
            } else if (subcommand === 'remove') {
                const guildId = interaction.options.getString('guild-id')?.trim();
                const commandId = interaction.options.getString('command-id')?.trim();

                const guild = guildId ? interaction.client.guilds.cache.get(guildId) : undefined;
                if (guildId && !guild) {
                    await interaction.reply('Guild not found in client cache');
                    return;
                }

                const command = commandId
                    ? guild
                        ? guild.commands.cache.get(commandId)
                        : interaction.client.application.commands.cache.get(commandId)
                    : undefined;
                if (commandId && !command) {
                    await interaction.reply('Command not found in client cache');
                    return;
                }

                const commandFragment = command ? `command "${command.name}"` : 'all commands';
                const guildFragment = guild ? `from guild "${guild.name}"` : 'globally';
                const messageFragment = `${commandFragment} ${guildFragment}`;

                await interaction.reply(`Removing ${messageFragment}...`);
                if (guild && command) {
                    await interaction.client.application.commands.delete(command.id, guild.id);
                } else if (guild) {
                    await interaction.client.application.commands.set([], guild.id);
                } else if (command) {
                    await interaction.client.application.commands.delete(command.id);
                } else {
                    await interaction.client.application.commands.set([]);
                }
                await interaction.editReply(`Removed ${messageFragment}!`);
            }
        }
    },
});
