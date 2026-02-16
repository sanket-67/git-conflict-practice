import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    orderId: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    amount: Number,
    status: String
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
