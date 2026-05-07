import "dotenv/config";
import { REST, Routes } from "discord.js";

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

const commands = [purge, say, serverlist, globalban, unglobalban, globalbanlist, setlogchannel, dm, allowuser, botowner].map((cmd) => cmd.data.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) throw new Error("DISCORD_TOKEN is not set.");
if (!clientId) throw new Error("CLIENT_ID is not set.");

const rest = new REST().setToken(token);

try {
  console.log(`[Deploy] Registering ${commands.length} slash commands globally...`);
  const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`[Deploy] ✅ Successfully registered ${data.length} commands.`);
  console.log("[Deploy] Commands registered:");
  for (const cmd of data) console.log(`  /${cmd.name}`);
  console.log("[Deploy] Note: Global commands may take up to 1 hour to appear in Discord.");
} catch (err) {
  console.error("[Deploy] Failed:", err);
  process.exit(1);
}
