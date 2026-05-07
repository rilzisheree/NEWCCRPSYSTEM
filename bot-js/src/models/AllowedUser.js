import mongoose from "mongoose";

const AllowedUserSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  guildId:   { type: String, required: true },
  command:   { type: String, required: true },
  grantedBy: { type: String, required: true },
  grantedAt: { type: Date, default: Date.now },
});

AllowedUserSchema.index({ userId: 1, guildId: 1, command: 1 }, { unique: true });

export default mongoose.model("AllowedUser", AllowedUserSchema);
