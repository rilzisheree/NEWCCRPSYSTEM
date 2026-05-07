import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { isOwner } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import LogChannel from "../models/LogChannel.js";
import { ORANGE, RED, GREEN, GRAY } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("setlogchannel")
  .setDescription("Manage the global log channel for the bot.")
  .addSubcommand((sub) =>
    sub.setName("setglobal").setDescription("Set a channel as the global log channel (Bot Owner only).")
      .addChannelOption((opt) => opt.setName("channel").setDescription("The text channel to use for all bot logs").setRequired(true))
  )
  .addSubcommand((sub) => sub.setName("remove").setDescription("Remove the global log channel (Bot Owner only)."))
  .addSubcommand((sub) => sub.setName("check").setDescription("Check what the current global log channel is."));

export async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === "check") {
    const doc = await LogChannel.findOne();
    if (!doc) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(GRAY).setDescription("📋 No global log channel is currently set.")],
        ephemeral: true,
      });
    }
    let channelMention = `\`${doc.channelId}\``;
    try { await client.channels.fetch(doc.channelId); channelMention = `<#${doc.channelId}>`; } catch {}
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle("📋 Global Log Channel")
          .addFields(
            { name: "Channel", value: channelMention, inline: true },
            { name: "Set By", value: `<@${doc.setBy}>`, inline: true },
            { name: "Set At", value: `<t:${Math.floor(doc.setAt.getTime() / 1000)}:R>`, inline: true }
          )
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  }

  if (!(await isOwner(interaction.user.id))) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ Only bot owners can change the log channel.")],
      ephemeral: true,
    });
  }

  if (sub === "setglobal") {
    const channelOption = interaction.options.getChannel("channel", true);
    let channel;
    try {
      const fetched = await client.channels.fetch(channelOption.id);
      if (!fetched || !fetched.isTextBased() || fetched.isDMBased()) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ That must be a text channel.")], ephemeral: true });
      }
      channel = fetched;
    } catch {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ Could not access that channel.")], ephemeral: true });
    }

    await LogChannel.deleteMany({});
    await LogChannel.create({ channelId: channel.id, setBy: interaction.user.id });

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(GREEN).setTitle("✅ Global Log Channel Set").setDescription(`All bot logs will now be sent to <#${channel.id}>.`).setTimestamp()],
      ephemeral: true,
    });
    await logEvent(client, buildCommandLog("setlogchannel setglobal", interaction.user, interaction.guild, `Log channel → <#${channel.id}>`));

  } else if (sub === "remove") {
    const existing = await LogChannel.findOne();
    if (!existing) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ No global log channel is currently set.")], ephemeral: true });
    }
    await LogChannel.deleteMany({});
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(GREEN).setTitle("✅ Global Log Channel Removed").setDescription("Logging disabled. Use `/setlogchannel setglobal` to re-enable.").setTimestamp()],
      ephemeral: true,
    });
  }
}
