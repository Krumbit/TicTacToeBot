import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, GuildMember, InteractionResponse, Utils } from "discord.js";

// Enum for all the square states
enum State {
  Empty,
  Naught,
  Cross,
}

// Square interface/type
interface Square {
  row: number;
  column: number;
  state: State;
};

export default class Game {
  grid: Square[][];
  currentPlayer: State;
  gameOver: boolean;
  draw: boolean;
  playerOne?: GuildMember;
  playerTwo?: GuildMember;

  constructor() {
    this.grid = [];
    this.resetBoard();

    this.currentPlayer = State.Cross;
    this.gameOver = false;
    this.draw = false;
  }

  // System for accepting/rejecting duel invites
  async preGame(interaction: ChatInputCommandInteraction) {
    this.playerOne = interaction.member as GuildMember;
    this.playerTwo = interaction.guild?.members.cache.get(interaction.options.getUser("member")!.id);

    const embed = new EmbedBuilder()
      .setTitle("Tic-Tac-Toe")
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL()! })
      .setDescription(`<@${interaction.user.id}> challenged you to a Tic-Tac-Toe 1v1.`)
      .setColor(Colors.NotQuiteBlack)
      .setFooter({ text: "You have 30 seconds to accept." });

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("acceptFight")
          .setEmoji("✅")
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("denyFight")
          .setEmoji("❌")
          .setLabel("Deny")
          .setStyle(ButtonStyle.Secondary)
      );

    const msg = await interaction.reply({ content: `<@${this.playerTwo?.user.id}>`, embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      filter: i => i.user.id === this.playerTwo?.user.id,
    });

    collector.on('collect', i => {
      i.deferUpdate();
      if (i.customId == "denyFight") return collector.stop();
      if (i.customId === "acceptFight") collector.stop('accepted');

      this.startGame(msg);
    });

    collector.on('end', collected => {
      if (collector.endReason === "accepted") return;

      embed.setDescription(`<@${interaction.user.id}>'s duel invite to <@${this.playerTwo?.user.id}> was cancelled.`);
      embed.setColor(Colors.Grey);
      if (collector.endReason === "user") {
        embed.setFooter({ text: "User rejected invite." });
      } else if (collector.endReason === "time") {
        embed.setFooter({ text: "Ran out of time." });
      }

      row.components.forEach(button => button.setDisabled(true));

      interaction.editReply({ content: "", embeds: [embed], components: [row] });
      return;
    });
  }

  async startGame(interaction: InteractionResponse) {
    const embed = new EmbedBuilder()
      .setTitle('Tic-Tac-Toe')
      .setDescription(`<@${this.playerOne?.id}> ⚔️ <@${this.playerTwo?.id}>`)
      .setColor(Colors.Blue);

    const msg = await interaction.edit({ content: "", embeds: [embed], components: this.getComponentsArray() });
    const collector = await msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
      filter: i => i.user.id === this.playerOne?.id || i.user.id === this.playerTwo?.id
    });

    collector.on('collect', async i => {
      i.deferUpdate();
      if ((this.currentPlayer === State.Naught && i.user.id !== this.playerOne?.id) || (this.currentPlayer === State.Cross && i.user.id !== this.playerTwo?.id)) return;

      // Takes the custom id of the button clicked and turns it into a number array
      // Ex: "1,2" -> [1,2]
      const arr = i.customId.split(",").map(Number);
      this.makeMove(arr[0], arr[1], interaction);
      if (this.gameOver) {
        collector.stop();
        const endRows = await this.endGame(interaction);
        this.listenForPlayAgain(interaction, endRows.rows, endRows.playAgainRow);
        return;
      }

      const newEmbed = new EmbedBuilder(i.message.embeds[0].data)
        .setDescription(this.currentPlayer === State.Naught ? `➡️ ${this.playerOne}\n**VS**\n${this.playerTwo}` : `${this.playerOne}\n**VS**\n➡️ ${this.playerTwo}`);

      await i.message.edit({ embeds: [newEmbed], components: this.getComponentsArray() });
    });
  }

  makeMove(row: number, column: number, message: InteractionResponse) {
    if (this.gameOver) {
      console.log('The game is already over.');
      return;
    }

    const square = this.grid[row][column];
    if (square.state !== State.Empty) {
      console.log('Invalid move. Square is already occupied.');
      return;
    }

    square.state = this.currentPlayer;
    this.checkGameOver();
    this.switchPlayer();
  }


  async endGame(message: InteractionResponse) {
    // Make win embed that gets formatted depending on what the ending currentPlayer variable was
    const embed = new EmbedBuilder((await message.fetch()).embeds[0].data)
      .setTitle(this.draw ? "Draw" : this.currentPlayer === State.Naught ? "❌ Crosses Win" : "⭕️ Naughts Win")
      .setDescription(this.draw ? "No one won!" : this.currentPlayer === State.Naught ? `<@${this.playerTwo?.id}> beat <@${this.playerOne?.id}>` : `<@${this.playerOne?.id}> beat <@${this.playerTwo?.id}>`)
      .setFooter({ text: "You have 10 seconds to press play again." })
      .setColor(Colors.Yellow);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const winningSquares = this.checkGameOver();
    this.getComponentsArray().forEach(row => {
      const buttons: ButtonBuilder[] = [];
      row.components.forEach(button => {
        const buttonData = button.toJSON();
        // Typeguard the buttonData variable to make the custom_id property accessible
        if (!Utils.isInteractionButton(buttonData)) return;
        if (!this.draw) {
          // Check if the square ID matches one the winning square arrays
          if (winningSquares?.some(square => buttonData.custom_id.split(",").map(Number).every((v, i) => v === square[i]))) {
            button.setStyle(ButtonStyle.Success);
          }
        }
        button.setDisabled(true);
        buttons.push(button);
      });
      row.setComponents(buttons);
      rows.push(row);
    });
    const playAgainRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("playAgain")
          .setLabel("Play Again")
          .setEmoji("🔁")
          .setStyle(ButtonStyle.Secondary)
      );

    message.edit({ embeds: [embed], components: [...rows, playAgainRow] });
    return { rows, playAgainRow };
  }

  // Play again button logic
  listenForPlayAgain(message: InteractionResponse, gameRows: ActionRowBuilder<ButtonBuilder>[], playAgainRow: ActionRowBuilder<ButtonBuilder>) {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 10000,
      filter: i => i.user.id === this.playerOne?.id || i.user.id === this.playerTwo?.id,
      max: 2
    });

    collector.on('collect', interaction => {
      interaction.deferUpdate();
      if (interaction.customId !== "playAgain") return;
    });

    collector.on('end', async collected => {
      if (collector.endReason === "limit") {
        this.gameOver = false;
        this.resetBoard();
        this.currentPlayer = State.Cross;
        await this.startGame(message);
        return;
      } else if (collector.endReason === "time") {
        await message.edit({ components: [...gameRows] });
        return;
      }
    });
  }


  switchPlayer() {
    this.currentPlayer = this.currentPlayer === State.Cross ? State.Naught : State.Cross;
  }

  checkGameOver() {
    // Check rows
    for (let row = 0; row < 3; row++) {
      if (
        this.grid[row][0].state !== State.Empty &&
        this.grid[row][0].state === this.grid[row][1].state &&
        this.grid[row][0].state === this.grid[row][2].state
      ) {
        this.gameOver = true;
        return [[row, 0], [row, 1], [row, 2]];
      }
    }

    // Check columns
    for (let column = 0; column < 3; column++) {
      if (
        this.grid[0][column].state !== State.Empty &&
        this.grid[0][column].state === this.grid[1][column].state &&
        this.grid[0][column].state === this.grid[2][column].state
      ) {
        this.gameOver = true;
        return [[0, column], [1, column], [2, column]];
      }
    }

    // Check diagonals
    if (
      this.grid[0][0].state !== State.Empty &&
      this.grid[0][0].state === this.grid[1][1].state &&
      this.grid[0][0].state === this.grid[2][2].state
    ) {
      this.gameOver = true;
      return [[0, 0], [1, 1], [2, 2]];
    }

    if (
      this.grid[0][2].state !== State.Empty &&
      this.grid[0][2].state === this.grid[1][1].state &&
      this.grid[0][2].state === this.grid[2][0].state
    ) {
      this.gameOver = true;
      return [[0, 2], [1, 1], [2, 0]];
    }

    // Check for a draw
    if (!this.grid.some((row) => row.some((square) => square.state === State.Empty))) {
      this.gameOver = true;
      this.draw = true;
    }
  }

  getComponentsArray() {
    let result = [];
    for (let row = 0; row < 3; row++) {
      const actionRow = new ActionRowBuilder<ButtonBuilder>();
      for (let column = 0; column < 3; column++) {
        const square = this.grid[row][column];
        const button = new ButtonBuilder()
          .setCustomId(`${row},${column}`);

        switch (square.state) {
          case State.Empty:
            button.setLabel("‎").setStyle(ButtonStyle.Secondary);
            break;
          case State.Naught:
            button.setLabel("O").setStyle(ButtonStyle.Primary);
            break;
          case State.Cross:
            button.setLabel("X").setStyle(ButtonStyle.Danger);
            break;
        }

        actionRow.addComponents(button);
      }
      result.push(actionRow);
    }

    return result;
  }

  resetBoard() {
    for (let row = 0; row < 3; row++) {
      this.grid[row] = [];
      for (let column = 0; column < 3; column++) {
        this.grid[row][column] = { row, column, state: State.Empty };
      }
    }
  }
}