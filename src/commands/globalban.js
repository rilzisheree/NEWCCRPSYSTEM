import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { isOwner } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import GlobalBan from "../models/GlobalBan.js";
import { ORANGE, RED } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("globalban")
  .setDescription("Globally ban a user from all servers the bot is in (Bot Owner only).")
  .addUserOption((opt) => opt.setName("user").setDescription("User to globally ban").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the global ban").setRequired(true));

export async function execute(interaction, client) {
  if (!(await isOwner(interaction.user.id))) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ This command is restricted to bot owners.")],
      ephemeral: true,
    });
  }

  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason", true);

  if (await isOwner(target.id)) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ You cannot globally ban another bot owner.")],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const existing = await GlobalBan.findOne({ userId: target.id });
  if (existing) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ **${target.tag}** is already globally banned.\n**Reason:** ${existing.reason}`)],
    });
  }

  await GlobalBan.create({ userId: target.id, username: target.tag, reason, bannedBy: interaction.user.id, bannedByUsername: interaction.user.tag });

  let banned = 0, failed = 0;
  for (const guild of client.guilds.cache.values()) {
    try { await guild.bans.create(target.id, { reason: `[GlobalBan] ${reason}` }); banned++; }
    catch { failed++; }
  }

  try {
    await target.send({
      embeds: [new EmbedBuilder().setColor(RED).setTitle("🔨 You have been Globally Banned").setDescription(`You have been globally banned from all servers using this bot.\n\n**Reason:** ${reason}`).setTimestamp()],
    });
  } catch {}

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(ORANGE)
        .setTitle("🔨 Global Ban Executed")
        .addFields(
          { name: "User", value: `${target.tag} (\`${target.id}\`)`, inline: true },
          { name: "Reason", value: reason, inline: true },
          { name: "Banned In", value: `${banned} server${banned !== 1 ? "s" : ""}`, inline: true },
          { name: "Failed", value: `${failed} server${failed !== 1 ? "s" : ""}`, inline: true }
        )
        .setTimestamp(),
    ],
  });

  await logEvent(client, buildCommandLog("globalban", interaction.user, interaction.guild, `Globally banned ${target.tag} — Reason: ${reason}`));
}
