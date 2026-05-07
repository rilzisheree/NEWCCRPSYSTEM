import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { hasCommandPermission } from "../utils/permissions.js";
import { logEvent, buildCommandLog } from "../utils/globalLogger.js";
import { RED } from "../utils/colors.js";

export const data = new SlashCommandBuilder()
  .setName("say")
  .setDescription("Send, reply to, or edit a message as the bot.")
  .addStringOption((opt) => opt.setName("message").setDescription("The message content to send").setRequired(true))
  .addChannelOption((opt) => opt.setName("channel").setDescription("Channel to send the message in (defaults to current)").setRequired(false))
  .addStringOption((opt) => opt.setName("reply_to").setDescription("Message ID to reply to").setRequired(false))
  .addStringOption((opt) => opt.setName("edit").setDescription("Message ID of a bot message to edit").setRequired(false));

export async function execute(interaction, client) {
  if (!interaction.inGuild() || !interaction.guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }

  const member = interaction.member;
  const allowed = await hasCommandPermission(member, "say", [PermissionFlagsBits.ManageMessages]);
  if (!allowed) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(RED).setDescription("❌ You don't have permission to use this command.")],
      ephemeral: true,
    });
  }

  const content = interaction.options.getString("message", true);
  const channelOption = interaction.options.getChannel("channel");
  const replyToId = interaction.options.getString("reply_to");
  const editId = interaction.options.getString("edit");

  await interaction.deferReply({ ephemeral: true });

  try {
    const targetChannel = channelOption
      ? await interaction.guild.channels.fetch(channelOption.id)
      : interaction.channel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      return interaction.editReply({ content: "❌ Invalid channel." });
    }

    if (editId) {
      const msg = await targetChannel.messages.fetch(editId);
      if (msg.author.id !== client.user.id) return interaction.editReply({ content: "❌ I can only edit my own messages." });
      await msg.edit(content);
      await interaction.editReply({ content: `✅ Message edited in <#${targetChannel.id}>.` });
      await logEvent(client, buildCommandLog("say (edit)", interaction.user, interaction.guild, `Edited \`${editId}\` in <#${targetChannel.id}>`));
      return;
    }

    if (replyToId) {
      const msgToReply = await targetChannel.messages.fetch(replyToId);
      await msgToReply.reply(content);
      await interaction.editReply({ content: `✅ Reply sent in <#${targetChannel.id}>.` });
      await logEvent(client, buildCommandLog("say (reply)", interaction.user, interaction.guild, `Replied to \`${replyToId}\` in <#${targetChannel.id}>`));
      return;
    }

    await targetChannel.send(content);
    await interaction.editReply({ content: `✅ Message sent in <#${targetChannel.id}>.` });
    await logEvent(client, buildCommandLog("say", interaction.user, interaction.guild, `Sent in <#${targetChannel.id}>: "${content.substring(0, 200)}"`));
  } catch (err) {
    await interaction.editReply({ content: `❌ Error: ${err.message}` });
  }
}
