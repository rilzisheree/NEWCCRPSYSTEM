import { EmbedBuilder } from "discord.js";
import LogChannel from "../models/LogChannel.js";
import { ORANGE, GRAY, RED } from "./colors.js";

async function getLogChannel(client) {
  const doc = await LogChannel.findOne();
  if (!doc) return null;
  try {
    const channel = await client.channels.fetch(doc.channelId);
    if (channel && channel.isTextBased() && !channel.isDMBased()) return channel;
  } catch {}
  return null;
}

export async function logEvent(client, embed) {
  try {
    const channel = await getLogChannel(client);
    if (!channel) return;
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[Logger] Failed to send log:", err);
  }
}

export function buildCommandLog(commandName, user, guild, extra) {
  return new EmbedBuilder()
    .setColor(ORANGE)
    .setTitle("🛠️ Command Used")
    .addFields(
      { name: "Command", value: `\`/${commandName}\``, inline: true },
      { name: "User", value: `${user.tag} (\`${user.id}\`)`, inline: true },
      { name: "Server", value: guild ? `${guild.name} (\`${guild.id}\`)` : "N/A", inline: true },
      ...(extra ? [{ name: "Details", value: extra }] : [])
    )
    .setTimestamp();
}

export function buildMessageDeleteLog(content, author, guild, channelName) {
  return new EmbedBuilder()
    .setColor(RED)
    .setTitle("🗑️ Message Deleted")
    .addFields(
      { name: "Author", value: author ? `${author.tag} (\`${author.id}\`)` : "Unknown", inline: true },
      { name: "Channel", value: `#${channelName}`, inline: true },
      { name: "Server", value: guild ? guild.name : "Unknown", inline: true },
      { name: "Content", value: (content || "*No text content*").substring(0, 1024) }
    )
    .setTimestamp();
}

export function buildMessageEditLog(oldContent, newContent, author, guild, channelName, messageUrl) {
  return new EmbedBuilder()
    .setColor(GRAY)
    .setTitle("✏️ Message Edited")
    .setURL(messageUrl)
    .addFields(
      { name: "Author", value: author ? `${author.tag} (\`${author.id}\`)` : "Unknown", inline: true },
      { name: "Channel", value: `#${channelName}`, inline: true },
      { name: "Server", value: guild ? guild.name : "Unknown", inline: true },
      { name: "Before", value: (oldContent || "*empty*").substring(0, 512) },
      { name: "After", value: (newContent || "*empty*").substring(0, 512) }
    )
    .setTimestamp();
}
