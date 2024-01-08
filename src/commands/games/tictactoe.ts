import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import BotGame from "../../tictactoe/BotGame";
import Game from "../../tictactoe/Game";

export default {
  // Command data
  data: new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("Start a Tic-Tac-Toe game")
    .addSubcommand(subcommand =>
      subcommand
        .setName('duel')
        .setDescription('1v1 against another member')
        .addUserOption(option => option.setName('member').setDescription('Member you wish to 1v1').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('bot')
        .setDescription('Fight against the bot')),

  async execute(interaction: ChatInputCommandInteraction) {
    // Get the subcommand used, and make a new instance of the appropriate game class.
    if (interaction.options.getSubcommand() == "duel") {
      return new Game().preGame(interaction);
    } else if (interaction.options.getSubcommand() == "bot") {
      return new BotGame().preGame(interaction);
    }
  }
};