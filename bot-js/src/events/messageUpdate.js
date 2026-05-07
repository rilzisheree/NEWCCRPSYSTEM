import { logEvent, buildMessageEditLog } from "../utils/globalLogger.js";

export default function register(client) {
  client.on("messageUpdate", async (oldMsg, newMsg) => {
    if (newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    try {
      const embed = buildMessageEditLog(
        oldMsg.content ?? "",
        newMsg.content ?? "",
        newMsg.author ?? null,
        newMsg.guild ?? null,
        newMsg.channel?.name ?? "unknown",
        newMsg.url
      );
      await logEvent(client, embed);
    } catch {}
  });
}
