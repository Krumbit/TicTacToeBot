import chalk from "chalk";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import fs from "fs";
import path from "path";

import * as dotenv from "dotenv";
dotenv.config();

// Add the commands property to the discord.js Client class
declare module "discord.js" {
  interface Client {
    commands: Collection<string, any>;
  }
}

// Instantiate client with the Guilds intent
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Register commands
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath).default;

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(chalk.red(`[WARNING] Command at ${filePath} is missing a required "data" or "execute" property.`));
    }
  }
}

// Register events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath).default;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Login to discord client using .env token
client.login(process.env.TOKEN);