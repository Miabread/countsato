import { Collection, Events } from "discord.js";
import { client } from "../index.ts";
import { commands } from "../commands/index.ts";

const commandMap = new Collection(
  commands.map((command) => [command.data.name, command]),
);

const devIds = (process.env.DEV_IDS ?? "").split(",");

const errorReply = { content: "Error while running command", ephemeral: true };

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);

  if (!command) {
    console.error(`No command ${interaction.commandName} found`);
    await interaction.reply(errorReply);
    return;
  }

  if (command.private && !devIds.includes(interaction.user.id)) {
    await interaction.reply(errorReply);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});
