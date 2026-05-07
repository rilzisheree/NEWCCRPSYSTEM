import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { hasCommandPermission } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import { ORANGE, RED } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Delete a number of messages from this channel.")
  .addIntegerOption((opt) =>
    opt.setName("amount").setDescription("Number of messages to delete (1–100)").setMinValue(1).setMaxValue(100).setRequired(true)
  )
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Only delete messages from this user").setRequired(false)
  );

export async function execute(interaction, client) {
  if (!interaction.inGuild() || !interaction.guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }

  const member = interaction.member;
  const allowed = await hasCommandPermission(member, "purge", [PermissionFlagsBits.ManageMessages]);
  if (!allowed) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ You don't have permission to use this command.")],
      ephemeral: true,
    });
  }

  const amount = interaction.options.getInteger("amount", true);
  const targetUser = interaction.options.getUser("user");
  const channel = interaction.channel;

  await interaction.deferReply({ ephemeral: true });

  try {
    let messages = await channel.messages.fetch({ limit: 100 });
    if (targetUser) messages = messages.filter((m) => m.author.id === targetUser.id);
    const toDelete = [...messages.values()].slice(0, amount);

    if (toDelete.length === 0) {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ No messages found to delete.")] });
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(ORANGE)
          .setTitle("🧹 Purge Complete")
          .setDescription(`Deleted **${deleted.size}** message${deleted.size !== 1 ? "s" : ""}${targetUser ? ` from ${targetUser.tag}` : ""}.`)
          .setTimestamp(),
      ],
    });

    await logEvent(client, buildCommandLog("purge", interaction.user, interaction.guild, `Deleted ${deleted.size} messages in <#${channel.id}>${targetUser ? ` from ${targetUser.tag}` : ""}`));
  } catch (err) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription(`❌ Failed to delete messages. ${err?.message ?? "Messages older than 14 days cannot be bulk deleted."}`)],
    });
  }
}
