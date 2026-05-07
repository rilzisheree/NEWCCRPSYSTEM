import mongoose from "mongoose";

const BotOwnerSchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true },
  username: { type: String, required: true },
  addedBy:  { type: String, required: true },
  addedAt:  { type: Date, default: Date.now },
});

export default mongoose.model("BotOwner", BotOwnerSchema);
