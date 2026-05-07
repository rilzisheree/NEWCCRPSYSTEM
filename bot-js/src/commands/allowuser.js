import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { hasCommandPermission } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import AllowedUser from "../models/AllowedUser.js";
import { ORANGE, RED, GREEN, GRAY } from "../utils/colors.js";

const VALID_COMMANDS = ["purge", "say", "dm", "globalban", "unglobalban", "globalbanlist", "serverlist", "setlogchannel", "allowuser", "botowner"];

export const data = new SlashCommandBuilder()
  .setName("allowuser")
  .setDescription("Grant or revoke command permissions for users in this server.")
  .addSubcommand((sub) =>
    sub.setName("add").setDescription("Allow a user to use a specific command.")
      .addUserOption((opt) => opt.setName("user").setDescription("User to grant permission to").setRequired(true))
      .addStringOption((opt) => opt.setName("command").setDescription("Command to grant access to").setRequired(true).addChoices(...VALID_COMMANDS.map((c) => ({ name: c, value: c }))))
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("Remove a user's permission to use a specific command.")
      .addUserOption((opt) => opt.setName("user").setDescription("User to revoke permission from").setRequired(true))
      .addStringOption((opt) => opt.setName("command").setDescription("Command to revoke access from").setRequired(true).addChoices(...VALID_COMMANDS.map((c) => ({ name: c, value: c }))))
  )
  .addSubcommand((sub) => sub.setName("list").setDescription("List all users with granted command permissions in this server."))
  .addSubcommand((sub) =>
    sub.setName("check").setDescription("Check which commands a specific user is allowed to use.")
      .addUserOption((opt) => opt.setName("user").setDescription("User to check").setRequired(true))
  );

export async function execute(interaction, client) {
  if (!interaction.inGuild() || !interaction.guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }

  const allowed = await hasCommandPermission(interaction.member, "allowuser", [PermissionFlagsBits.Administrator]);
  if (!allowed) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ You need Administrator permission or explicit access to use this command.")],
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "add") {
    const target = interaction.options.getUser("user", true);
    const command = interaction.options.getString("command", true);
    const existing = await AllowedUser.findOne({ userId: target.id, guildId, command });
    if (existing) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ **${target.tag}** already has access to \`/${command}\`.`)], ephemeral: true });
    }
    await AllowedUser.create({ userId: target.id, guildId, command, grantedBy: interaction.user.id });
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(GREEN).setTitle("✅ Permission Granted").setDescription(`**${target.tag}** can now use \`/${command}\` in this server.`).setTimestamp()],
      ephemeral: true,
    });
    await logEvent(client, buildCommandLog("allowuser add", interaction.user, interaction.guild, `Granted ${target.tag} access to /${command}`));

  } else if (sub === "remove") {
    const target = interaction.options.getUser("user", true);
    const command = interaction.options.getString("command", true);
    const deleted = await AllowedUser.findOneAndDelete({ userId: target.id, guildId, command });
    if (!deleted) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ **${target.tag}** doesn't have a custom permission for \`/${command}\`.`)], ephemeral: true });
    }
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(ORANGE).setTitle("🔒 Permission Revoked").setDescription(`**${target.tag}** can no longer use \`/${command}\` via allowuser.`).setTimestamp()],
      ephemeral: true,
    });
    await logEvent(client, buildCommandLog("allowuser remove", interaction.user, interaction.guild, `Revoked ${target.tag}'s access to /${command}`));

  } else if (sub === "list") {
    const entries = await AllowedUser.find({ guildId }).sort({ command: 1 });
    if (entries.length === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GRAY).setDescription("📋 No custom command permissions set in this server.")], ephemeral: true });
    }
    const grouped = {};
    for (const entry of entries) {
      if (!grouped[entry.command]) grouped[entry.command] = [];
      grouped[entry.command].push(`<@${entry.userId}>`);
    }
    const embed = new EmbedBuilder().setColor(ORANGE).setTitle("📋 Allowed Users — This Server").setTimestamp();
    for (const [cmd, users] of Object.entries(grouped)) embed.addFields({ name: `/${cmd}`, value: users.join(", ") });
    await interaction.reply({ embeds: [embed], ephemeral: true });

  } else if (sub === "check") {
    const target = interaction.options.getUser("user", true);
    const entries = await AllowedUser.find({ userId: target.id, guildId });
    if (entries.length === 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(GRAY).setDescription(`📋 **${target.tag}** has no custom command permissions in this server.`)], ephemeral: true });
    }
    const cmds = entries.map((e) => `\`/${e.command}\``).join(", ");
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(ORANGE).setTitle(`📋 Permissions for ${target.tag}`).setDescription(`Allowed commands: ${cmds}`).setTimestamp()],
      ephemeral: true,
    });
  }
}
