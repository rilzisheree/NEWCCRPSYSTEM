import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { isOwner } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import GlobalBan from "../models/GlobalBan.js";
import { RED, GREEN } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("unglobalban")
  .setDescription("Remove a user's global ban (Bot Owner only).")
  .addStringOption((opt) => opt.setName("userid").setDescription("Discord user ID to unban globally").setRequired(true));

export async function execute(interaction, client) {
  if (!(await isOwner(interaction.user.id))) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ This command is restricted to bot owners.")],
      ephemeral: true,
    });
  }

  const userId = interaction.options.getString("userid", true).trim();
  await interaction.deferReply({ ephemeral: true });

  const ban = await GlobalBan.findOne({ userId });
  if (!ban) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ No global ban found for user ID \`${userId}\`.`)],
    });
  }

  await GlobalBan.deleteOne({ userId });

  let unbanned = 0, failed = 0;
  for (const guild of client.guilds.cache.values()) {
    try { await guild.bans.remove(userId, `[GlobalBan Lifted] By ${interaction.user.tag}`); unbanned++; }
    catch { failed++; }
  }

  let userTag = ban.username;
  try {
    const user = await client.users.fetch(userId);
    userTag = user.tag;
    await user.send({
      embeds: [new EmbedBuilder().setColor(GREEN).setTitle("✅ Global Ban Lifted").setDescription("Your global ban has been removed. You may rejoin servers using this bot.").setTimestamp()],
    });
  } catch {}

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(GREEN)
        .setTitle("✅ Global Ban Removed")
        .addFields(
          { name: "User", value: `${userTag} (\`${userId}\`)`, inline: true },
          { name: "Unbanned In", value: `${unbanned} server${unbanned !== 1 ? "s" : ""}`, inline: true },
          { name: "Failed", value: `${failed} server${failed !== 1 ? "s" : ""}`, inline: true }
        )
        .setTimestamp(),
    ],
  });

  await logEvent(client, buildCommandLog("unglobalban", interaction.user, interaction.guild, `Lifted global ban for ${userTag} (${userId})`));
}
