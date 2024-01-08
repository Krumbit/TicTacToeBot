import chalk from "chalk";
import { Client, Events } from "discord.js";
import moment from "moment";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    // Print to console when the client is ready
    console.log(chalk.blueBright(`[STARTED] Successfully started ${client.user.tag} with ${client.guilds.cache.size || 0} guild(s) at ${moment().format('LTS')}.`));
  }
};