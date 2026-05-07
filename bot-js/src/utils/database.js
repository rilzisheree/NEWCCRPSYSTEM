import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is not set.");
  mongoose.connection.on("connected", () => console.log("[DB] Connected to MongoDB"));
  mongoose.connection.on("error", (err) => console.error("[DB] MongoDB error:", err));
  await mongoose.connect(uri);
}
