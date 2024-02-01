import { Collection, Events } from 'discord.js';
import { client } from '..';
import { commands } from '../commands';

const commandMap = new Collection(commands.map((command) => [command.data.name, command]));

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandMap.get(interaction.commandName);
    if (!command) return console.error(`No command ${interaction.commandName} found`);

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        const message = { content: 'Error while running command', ephemeral: true };
        if (interaction.replied || interaction.deferred) interaction.followUp(message);
        else interaction.reply(message);
    }
});
