import { EmbedBuilder } from "discord.js";
import GlobalBan from "../models/GlobalBan.js";
import { logEvent } from "../utils/globalLogger.js";
import { RED } from "../utils/colors.js";

export default function register(client) {
  client.on("guildMemberAdd", async (member) => {
    try {
      const ban = await GlobalBan.findOne({ userId: member.id });
      if (!ban) return;
      await member.ban({ reason: `[GlobalBan] ${ban.reason}` });
      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(RED)
              .setTitle("🔨 You are Globally Banned")
              .setDescription(`You are globally banned from all servers using this bot.\n\n**Reason:** ${ban.reason}`)
              .setTimestamp(),
          ],
        });
      } catch {}
      await logEvent(
        client,
        new EmbedBuilder()
          .setColor(RED)
          .setTitle("🔨 GlobalBan Auto-Applied")
          .setDescription(`**${member.user.tag}** tried to join **${member.guild.name}** and was auto-banned.`)
          .addFields({ name: "Reason", value: ban.reason })
          .setTimestamp()
      );
    } catch {}
  });
}
