import mongoose from "mongoose";

const LogChannelSchema = new mongoose.Schema({
  channelId: { type: String, required: true },
  setBy:     { type: String, required: true },
  setAt:     { type: Date, default: Date.now },
});

export default mongoose.model("LogChannel", LogChannelSchema);
