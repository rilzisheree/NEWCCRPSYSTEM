import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { hasCommandPermission } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import { ORANGE, RED, GREEN } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("dm")
  .setDescription("Send a direct message to a user as the bot.")
  .addUserOption((opt) => opt.setName("user").setDescription("The user to DM").setRequired(true))
  .addStringOption((opt) => opt.setName("message").setDescription("The message to send").setRequired(true));

export async function execute(interaction, client) {
  if (!interaction.inGuild() || !interaction.guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }

  const allowed = await hasCommandPermission(interaction.member, "dm", []);
  if (!allowed) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ You don't have permission to use this command.")],
      ephemeral: true,
    });
  }

  const target = interaction.options.getUser("user", true);
  const message = interaction.options.getString("message", true);

  await interaction.deferReply({ ephemeral: true });

  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(ORANGE)
          .setDescription(message)
          .setFooter({ text: `Sent from ${interaction.guild.name}` })
          .setTimestamp(),
      ],
    });

    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(GREEN).setDescription(`✅ DM sent to **${target.tag}** successfully.`).setTimestamp()],
    });

    await logEvent(client, buildCommandLog("dm", interaction.user, interaction.guild, `DM sent to ${target.tag} (${target.id})`));
  } catch {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ Could not DM **${target.tag}**. They may have DMs disabled.`)],
    });
  }
}
