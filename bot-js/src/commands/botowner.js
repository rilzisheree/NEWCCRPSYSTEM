import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { isOwner } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import BotOwner from "../models/BotOwner.js";
import { ORANGE, RED, GREEN } from "../utils/colors.js";

const envOwnerIds = (process.env.OWNER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);

export const data = new SlashCommandBuilder()
  .setName("botowner")
  .setDescription("Manage bot owners (existing owners only).")
  .addSubcommand((sub) =>
    sub.setName("add").setDescription("Add a new bot owner by user ID.")
      .addStringOption((opt) => opt.setName("userid").setDescription("The Discord user ID to grant bot owner access").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("Remove a bot owner by user ID.")
      .addStringOption((opt) => opt.setName("userid").setDescription("The Discord user ID to remove bot owner access from").setRequired(true))
  )
  .addSubcommand((sub) => sub.setName("list").setDescription("List all current bot owners."));

export async function execute(interaction, client) {
  if (!(await isOwner(interaction.user.id))) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ Only bot owners can manage bot owners.")],
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "add") {
    const userId = interaction.options.getString("userid", true).trim();
    if (await isOwner(userId)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ User \`${userId}\` is already a bot owner.`)], ephemeral: true });
    }
    let username = userId;
    try { const user = await client.users.fetch(userId); username = user.tag; }
    catch { return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ Could not find a Discord user with ID \`${userId}\`.`)], ephemeral: true }); }

    await BotOwner.create({ userId, username, addedBy: interaction.user.id });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(GREEN)
          .setTitle("✅ Bot Owner Added")
          .setDescription(`**${username}** (\`${userId}\`) now has full bot owner access.`)
          .addFields({ name: "What this means", value: "They can use every command, add/remove other owners, and bypass all permission checks." })
          .setTimestamp(),
      ],
      ephemeral: true,
    });
    await logEvent(client, buildCommandLog("botowner add", interaction.user, interaction.guild, `Added ${username} (${userId}) as bot owner`));

  } else if (sub === "remove") {
    const userId = interaction.options.getString("userid", true).trim();
    if (envOwnerIds.includes(userId)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ \`${userId}\` is a root owner set via \`OWNER_IDS\` env var — remove them from Railway Variables instead.`)],
        ephemeral: true,
      });
    }
    const removed = await BotOwner.findOneAndDelete({ userId });
    if (!removed) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ No bot owner found with ID \`${userId}\`.`)], ephemeral: true });
    }
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(ORANGE).setTitle("🔒 Bot Owner Removed").setDescription(`**${removed.username}** (\`${userId}\`) no longer has bot owner access.`).setTimestamp()],
      ephemeral: true,
    });
    await logEvent(client, buildCommandLog("botowner remove", interaction.user, interaction.guild, `Removed ${removed.username} (${userId}) from bot owners`));

  } else if (sub === "list") {
    const dbOwners = await BotOwner.find().sort({ addedAt: 1 });
    const embed = new EmbedBuilder().setColor(ORANGE).setTitle("👑 Bot Owners").setTimestamp();
    if (envOwnerIds.length > 0) embed.addFields({ name: "🔐 Root Owners (OWNER_IDS env var)", value: envOwnerIds.map((id) => `<@${id}> (\`${id}\`)`).join("\n") });
    if (dbOwners.length > 0) embed.addFields({ name: "👑 Added via /botowner", value: dbOwners.map((o) => `${o.username} (\`${o.userId}\`) — added <t:${Math.floor(o.addedAt.getTime() / 1000)}:R>`).join("\n") });
    if (envOwnerIds.length === 0 && dbOwners.length === 0) embed.setDescription("No bot owners configured.");
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
