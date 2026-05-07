import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder } from "discord.js";
import { connectDatabase } from "./utils/database.js";
import { RED } from "./utils/colors.js";

import * as purge from "./commands/purge.js";
import * as say from "./commands/say.js";
import * as serverlist from "./commands/serverlist.js";
import * as globalban from "./commands/globalban.js";
import * as unglobalban from "./commands/unglobalban.js";
import * as globalbanlist from "./commands/globalbanlist.js";
import * as setlogchannel from "./commands/setlogchannel.js";
import * as dm from "./commands/dm.js";
import * as allowuser from "./commands/allowuser.js";
import * as botowner from "./commands/botowner.js";

import registerReady from "./events/ready.js";
import registerMessageDelete from "./events/messageDelete.js";
import registerMessageUpdate from "./events/messageUpdate.js";
import registerGuildMemberAdd from "./events/guildMemberAdd.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

const commands = new Collection();

const allCommands = [purge, say, serverlist, globalban, unglobalban, globalbanlist, setlogchannel, dm, allowuser, botowner];
for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

registerReady(client);
registerMessageDelete(client);
registerMessageUpdate(client);
registerGuildMemberAdd(client);

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(`[Bot] Error in /${interaction.commandName}:`, err);
    const errEmbed = new EmbedBuilder()
      .setColor(RED)
      .setDescription(`❌ An error occurred.\n\`\`\`${err.message}\`\`\``);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    } catch {}
  }
});

async function main() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error("DISCORD_TOKEN environment variable is not set.");
  await connectDatabase();
  await client.login(token);
}

main().catch((err) => {
  console.error("[Bot] Fatal startup error:", err);
  process.exit(1);
});
