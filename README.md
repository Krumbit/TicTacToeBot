# Tic-Tac-Toe Discord Bot

This is a simple Discord bot created with [discordjs.guide's bot guide](https://discordjs.guide/) (mainly for efficiency purposes) and a little help from ChatGPT for my AP Computer Science Principles class. Play against your friends, our fight the bot's Minimax algorithm for a fun pastime.

## Instructions

1. Clone the repository.
  ```bash
  git clone https://github.com/Krumbit/TicTacToeBot.git
  ```
2. Create a `.env` file in the root directory and paste the following code. Be sure to replace `YOUR_TOKEN_HERE` with your bot's token.
  ```
  TOKEN=YOUR_TOKEN_HERE
  ```
3. Go to [`src/config/config.json`](src/config/config.json) and replace `clientId` with your Discord bot's client ID and `guildId` with the ID of the guild in which you want the server to run in.
4. Install required packages with `yarn install`.
5. Start the bot with `yarn run start`.

## Commands
- `/ping` - Simple ping-pong command to check if the bot is online
- `/tictactoe bot` - Starts a Tic-Tac-Toe game against the bot
- `/tictactoe duel <member>` - Invites the player specified to a Tic-Tac-Toe game