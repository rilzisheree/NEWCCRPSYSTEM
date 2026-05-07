import mongoose from "mongoose";

const GlobalBanSchema = new mongoose.Schema({
  userId:          { type: String, required: true, unique: true },
  username:        { type: String, required: true },
  reason:          { type: String, required: true },
  bannedBy:        { type: String, required: true },
  bannedByUsername:{ type: String, required: true },
  bannedAt:        { type: Date, default: Date.now },
});

export default mongoose.model("GlobalBan", GlobalBanSchema);
