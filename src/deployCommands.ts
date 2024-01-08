import { REST, Routes } from 'discord.js';
import { clientId, guildId } from './config/config.json';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

import * as dotenv from "dotenv";
dotenv.config();

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Get all commands from the src/commands directory
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath).default;
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(chalk.red(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
    }
  }
}

// Log into the Discord REST api
const rest = new REST().setToken(process.env.TOKEN!);

(async () => {
  try {
    console.log(chalk.yellow(`[WORKING] Started refreshing ${commands.length} application (/) commands.`));

    // Register guild commands
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    console.log(chalk.green(`[DONE] Successfully reloaded ${(data as Array<any>).length} application (/) commands.`));
  } catch (error) {
    console.error(error);
  }
})();