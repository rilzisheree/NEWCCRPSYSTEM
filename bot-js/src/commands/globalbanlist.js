import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { isOwner } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import GlobalBan from "../models/GlobalBan.js";
import { ORANGE, RED, GREEN } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("globalbanlist")
  .setDescription("View all globally banned users (Bot Owner only).")
  .addIntegerOption((opt) => opt.setName("page").setDescription("Page number").setMinValue(1).setRequired(false));

export async function execute(interaction, client) {
  if (!(await isOwner(interaction.user.id))) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ This command is restricted to bot owners.")],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const perPage = 5;
  let page = (interaction.options.getInteger("page") ?? 1) - 1;

  const renderPage = async (pg) => {
    const total = await GlobalBan.countDocuments();
    const bans = await GlobalBan.find().skip(pg * perPage).limit(perPage).sort({ bannedAt: -1 });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    if (total === 0) {
      return { embed: new EmbedBuilder().setColor(GREEN).setTitle("✅ Global Ban List").setDescription("No globally banned users."), rows: [] };
    }

    const embed = new EmbedBuilder()
      .setColor(ORANGE)
      .setTitle(`🔨 Global Ban List — Page ${pg + 1}/${totalPages}`)
      .setDescription(`**${total}** user${total !== 1 ? "s" : ""} globally banned.`)
      .setTimestamp();

    for (const ban of bans) {
      embed.addFields({
        name: ban.username,
        value: [`**ID:** \`${ban.userId}\``, `**Reason:** ${ban.reason}`, `**Banned by:** ${ban.bannedByUsername}`, `**Date:** <t:${Math.floor(ban.bannedAt.getTime() / 1000)}:R>`].join("\n"),
      });
    }

    const navRow = new ActionRowBuilder();
    const unbanRow = new ActionRowBuilder();

    if (pg > 0) navRow.addComponents(new ButtonBuilder().setCustomId(`gbl_prev_${pg}`).setLabel("◀ Prev").setStyle(ButtonStyle.Secondary));
    if ((pg + 1) * perPage < total) navRow.addComponents(new ButtonBuilder().setCustomId(`gbl_next_${pg}`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary));
    for (const ban of bans) {
      unbanRow.addComponents(new ButtonBuilder().setCustomId(`gbl_unban_${ban.userId}`).setLabel(`Unban: ${ban.username.substring(0, 12)}`).setStyle(ButtonStyle.Danger));
    }

    const rows = [];
    if (navRow.components.length > 0) rows.push(navRow);
    if (unbanRow.components.length > 0) rows.push(unbanRow);
    return { embed, rows };
  };

  const { embed, rows } = await renderPage(page);
  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120_000 });

  collector.on("collect", async (btn) => {
    if (btn.user.id !== interaction.user.id) return btn.reply({ content: "Not your interaction.", ephemeral: true });
    await btn.deferUpdate();

    if (btn.customId.startsWith("gbl_prev_")) page = parseInt(btn.customId.split("_")[2]) - 1;
    else if (btn.customId.startsWith("gbl_next_")) page = parseInt(btn.customId.split("_")[2]) + 1;
    else if (btn.customId.startsWith("gbl_unban_")) {
      const userId = btn.customId.replace("gbl_unban_", "");
      const ban = await GlobalBan.findOneAndDelete({ userId });
      if (ban) {
        for (const guild of client.guilds.cache.values()) { try { await guild.bans.remove(userId); } catch {} }
        try {
          const user = await client.users.fetch(userId);
          await user.send({ embeds: [new EmbedBuilder().setColor(GREEN).setTitle("✅ Global Ban Lifted").setDescription("Your global ban has been removed.")] });
        } catch {}
        await logEvent(client, buildCommandLog("globalbanlist (unban)", interaction.user, interaction.guild, `Lifted global ban for ${ban.username} (${userId})`));
      }
    }

    const { embed, rows } = await renderPage(page);
    await interaction.editReply({ embeds: [embed], components: rows });
  });

  await logEvent(client, buildCommandLog("globalbanlist", interaction.user, interaction.guild));
}
