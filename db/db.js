import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/debug_demo");
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB connection failed", err.message);
    process.exit(1);
  }
};
