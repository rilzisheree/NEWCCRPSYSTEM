import { logEvent, buildMessageDeleteLog } from "../utils/globalLogger.js";

export default function register(client) {
  client.on("messageDelete", async (message) => {
    if (message.author?.bot) return;
    try {
      const embed = buildMessageDeleteLog(
        message.content ?? "",
        message.author ?? null,
        message.guild ?? null,
        message.channel?.name ?? "unknown"
      );
      await logEvent(client, embed);
    } catch {}
  });
}
