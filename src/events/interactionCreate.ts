import chalk from "chalk";
import { ChatInputCommandInteraction, Events } from "discord.js";

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: ChatInputCommandInteraction) {
    // Check if the interaction executed is a chat input command
    if (!interaction.isChatInputCommand()) return;

    // Check if command exists in the client.commands collection
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(chalk.red(`No command matching ${interaction.commandName} was found.`));
    }

    // Try to execute the execute function, handle the error if one gets caught
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `There was an error while executing this command!`, ephemeral: true });
      } else {
        await interaction.reply({ content: `There was an error while executing this command!`, ephemeral: true });
      }
    }
  }
};