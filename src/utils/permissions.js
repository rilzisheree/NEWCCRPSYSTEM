import AllowedUser from "../models/AllowedUser.js";
import BotOwner from "../models/BotOwner.js";

const envOwnerIds = (process.env.OWNER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export async function isOwner(userId) {
  if (envOwnerIds.includes(userId)) return true;
  const doc = await BotOwner.findOne({ userId });
  return !!doc;
}

export async function hasCommandPermission(member, command, requiredPermissions = []) {
  if (await isOwner(member.id)) return true;
  if (requiredPermissions.length > 0 && member.permissions.has(requiredPermissions)) return true;
  const allowed = await AllowedUser.findOne({ userId: member.id, guildId: member.guild.id, command });
  return !!allowed;
}
