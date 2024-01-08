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

export default class BotGame {
  grid: Square[][];
  currentPlayer: State;
  gameOver: boolean;
  draw: boolean;
  player?: GuildMember;

  constructor() {
    this.grid = [];
    this.resetBoard();

    this.currentPlayer = State.Cross;
    this.gameOver = false;
    this.draw = false;
  }

  async preGame(interaction: ChatInputCommandInteraction) {
    this.player = interaction.member as GuildMember;
    const embed = new EmbedBuilder()
      .setDescription(`Preparing...`)
      .setColor(Colors.NotQuiteBlack);

    const msg = await interaction.reply({ embeds: [embed] });
    this.startGame(msg);
  }

  async startGame(interaction: InteractionResponse) {
    const embed = new EmbedBuilder()
      .setTitle('Tic-Tac-Toe')
      .setDescription(`<@${this.player?.id}> ⚔️ **BOT**`)
      .setColor(Colors.Blue);

    const msg = await interaction.edit({ content: "", embeds: [embed], components: this.getComponentsArray() });

    const collector = await msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
      filter: i => i.user.id === this.player?.id
    });

    collector.on('collect', async i => {
      i.deferUpdate();

      // Takes the custom id of the button clicked and turns it into a number array
      // Ex: "1,2" -> [1,2]
      const arr = i.customId.split(",").map(Number);
      // Make the move and check if its valid
      const successful = this.makeMove(arr[0], arr[1], interaction);
      if (!successful) return;
      // Check if game is over after both user and bot inputs
      if (this.gameOver) {
        collector.stop();
        const endRows = await this.endGame(interaction);
        this.listenForPlayAgain(interaction, endRows.rows, endRows.playAgainRow);
        return;
      }
      this.makeSystemMove(interaction);
      if (this.gameOver) {
        collector.stop();
        const endRows = await this.endGame(interaction);
        this.listenForPlayAgain(interaction, endRows.rows, endRows.playAgainRow);
        return;
      }
      await i.message.edit({ components: this.getComponentsArray() });
    });
  }


  makeMove(row: number, column: number, message: InteractionResponse) {
    if (this.gameOver) {
      console.log('The game is already over.');
      return false;
    }

    const square = this.grid[row][column];
    if (square.state !== State.Empty) {
      console.log('Invalid move. Square is already occupied.');
      return false;
    }

    square.state = this.currentPlayer;
    this.checkGameOver();
    this.switchPlayer();
    return true;
  }

  async endGame(message: InteractionResponse) {
    // Make win embed that gets formatted depending on what the ending currentPlayer variable was
    const embed = new EmbedBuilder((await message.fetch()).embeds[0].data)
      .setTitle(this.draw ? "Draw" : this.currentPlayer === State.Naught ? "❌ Crosses Win" : "⭕️ Naughts Win")
      .setDescription(this.draw ? "No one won!" : this.currentPlayer === State.Naught ? `<@${this.player?.id}> beat **BOT**` : `**BOT** beat <@${this.player?.id}>`)
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
      filter: i => i.user.id === this.player?.id,
      max: 1
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

  // ChatGPT: Make bot move system
  makeSystemMove(message: InteractionResponse) {
    const bestMove = this.getBestMove();
    if (bestMove) {
      const { row, column } = bestMove;
      this.makeMove(row, column, message);
    }
  }

  getBestMove(): Square | null {
    let bestScore = -Infinity;
    let bestMove: Square | null = null;

    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        const square = this.grid[row][column];
        if (square.state === State.Empty) {
          square.state = State.Naught;
          const score = this.minimax(0, -Infinity, Infinity, false);
          square.state = State.Empty;

          if (score > bestScore) {
            bestScore = score;
            bestMove = square;
          }
        }
      }
    }

    return bestMove;
  }

  // ChatGPT: Check if the board is full
  isBoardFull(): boolean {
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        if (this.grid[row][column].state === State.Empty) {
          return false;
        }
      }
    }
    return true;
  }

  // ChatGPT: Minimax algorithm
  minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    if (this.checkWin(State.Cross)) {
      return -1; // Player wins
    }

    if (this.checkWin(State.Naught)) {
      return 1; // System wins
    }

    if (this.isBoardFull()) {
      return 0; // Draw
    }

    if (isMaximizing) {
      let maxScore = -Infinity;

      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          const square = this.grid[row][column];
          if (square.state === State.Empty) {
            square.state = State.Cross;
            const score = this.minimax(depth + 1, alpha, beta, false);
            square.state = State.Empty;
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) {
              break;
            }
          }
        }
      }

      return maxScore;
    } else {
      let minScore = Infinity;

      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 3; column++) {
          const square = this.grid[row][column];
          if (square.state === State.Empty) {
            square.state = State.Naught;
            const score = this.minimax(depth + 1, alpha, beta, true);
            square.state = State.Empty;
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) {
              break;
            }
          }
        }
      }

      return minScore;
    }
  }


  // ChatGPT: Change the current player
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === State.Cross ? State.Naught : State.Cross;
  }

  // ChatGPT: Check if game is over (regardless of player)
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

  // ChatGPT: check if player won
  checkWin(player: State): boolean {
    // Check rows
    for (let row = 0; row < 3; row++) {
      if (
        this.grid[row][0].state === player &&
        this.grid[row][1].state === player &&
        this.grid[row][2].state === player
      ) {
        return true;
      }
    }

    // Check columns
    for (let column = 0; column < 3; column++) {
      if (
        this.grid[0][column].state === player &&
        this.grid[1][column].state === player &&
        this.grid[2][column].state === player
      ) {
        return true;
      }
    }

    // Check diagonals
    if (
      (this.grid[0][0].state === player &&
        this.grid[1][1].state === player &&
        this.grid[2][2].state === player) ||
      (this.grid[0][2].state === player &&
        this.grid[1][1].state === player &&
        this.grid[2][0].state === player)
    ) {
      return true;
    }

    return false;
  }

  // Use the grid to generate 3 action row builders with buttons representing the squares
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

  // ChatGPT: Reset board function
  resetBoard() {
    for (let row = 0; row < 3; row++) {
      this.grid[row] = [];
      for (let column = 0; column < 3; column++) {
        this.grid[row][column] = { row, column, state: State.Empty };
      }
    }
  }
}