import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { isOwner } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import { ORANGE, RED } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("serverlist")
  .setDescription("List all servers the bot is in (Bot Owner only).")
  .addIntegerOption((opt) => opt.setName("page").setDescription("Page number").setMinValue(1).setRequired(false));

export async function execute(interaction, client) {
  if (!(await isOwner(interaction.user.id))) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ This command is restricted to bot owners.")],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guilds = [...client.guilds.cache.values()];
  const perPage = 5;
  let page = (interaction.options.getInteger("page") ?? 1) - 1;

  const buildPage = async (pg) => {
    const start = pg * perPage;
    const slice = guilds.slice(start, start + perPage);
    const totalPages = Math.max(1, Math.ceil(guilds.length / perPage));

    const embed = new EmbedBuilder()
      .setColor(ORANGE)
      .setTitle(`🌐 Server List — Page ${pg + 1}/${totalPages}`)
      .setDescription(`Bot is in **${guilds.length}** server${guilds.length !== 1 ? "s" : ""} total.`)
      .setTimestamp();

    for (const guild of slice) {
      let inviteLink = "No invite available";
      try {
        const channels = await guild.channels.fetch();
        const textChannel = channels.find((c) => c !== null && c.isTextBased() && !c.isDMBased());
        if (textChannel) {
          const invite = await textChannel.createInvite({ maxAge: 0, maxUses: 0 });
          inviteLink = invite.url;
        }
      } catch {}

      embed.addFields({
        name: guild.name,
        value: [`**ID:** \`${guild.id}\``, `**Members:** ${guild.memberCount}`, `**Owner:** <@${guild.ownerId}>`, `**Invite:** ${inviteLink}`].join("\n"),
      });
    }

    const navRow = new ActionRowBuilder();
    const leaveRow = new ActionRowBuilder();

    if (pg > 0) navRow.addComponents(new ButtonBuilder().setCustomId(`sl_prev_${pg}`).setLabel("◀ Prev").setStyle(ButtonStyle.Secondary));
    if ((pg + 1) * perPage < guilds.length) navRow.addComponents(new ButtonBuilder().setCustomId(`sl_next_${pg}`).setLabel("Next ▶").setStyle(ButtonStyle.Secondary));
    for (const guild of slice) {
      leaveRow.addComponents(new ButtonBuilder().setCustomId(`sl_leave_${guild.id}`).setLabel(`Leave: ${guild.name.substring(0, 15)}`).setStyle(ButtonStyle.Danger));
    }

    const rows = [];
    if (navRow.components.length > 0) rows.push(navRow);
    if (leaveRow.components.length > 0) rows.push(leaveRow);
    return { embed, rows };
  };

  const { embed, rows } = await buildPage(page);
  const reply = await interaction.editReply({ embeds: [embed], components: rows });

  const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120_000 });

  collector.on("collect", async (btn) => {
    if (btn.user.id !== interaction.user.id) return btn.reply({ content: "Not your interaction.", ephemeral: true });
    await btn.deferUpdate();

    if (btn.customId.startsWith("sl_prev_")) page = parseInt(btn.customId.split("_")[2]) - 1;
    else if (btn.customId.startsWith("sl_next_")) page = parseInt(btn.customId.split("_")[2]) + 1;
    else if (btn.customId.startsWith("sl_leave_")) {
      const guildId = btn.customId.replace("sl_leave_", "");
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const name = guild.name;
        await guild.leave();
        guilds.splice(guilds.findIndex((g) => g.id === guildId), 1);
        await logEvent(client, buildCommandLog("serverlist (leave)", interaction.user, null, `Left server: ${name} (${guildId})`));
        if (page > 0 && page * perPage >= guilds.length) page--;
      }
    }

    const { embed, rows } = await buildPage(page);
    await interaction.editReply({ embeds: [embed], components: rows });
  });

  collector.on("end", async () => { try { await interaction.editReply({ components: [] }); } catch {} });
  await logEvent(client, buildCommandLog("serverlist", interaction.user, interaction.guild));
}
