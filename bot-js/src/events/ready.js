import { ActivityType } from "discord.js";

export default function register(client) {
  client.once("clientReady", (readyClient) => {
    console.log(`[Bot] Logged in as ${readyClient.user.tag}`);
    console.log(`[Bot] In ${readyClient.guilds.cache.size} server(s)`);
    readyClient.user.setPresence({
      activities: [{ name: "over the servers", type: ActivityType.Watching }],
      status: "online",
    });
  });
}
