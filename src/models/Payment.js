const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
{
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true
  },

  membership: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Membership"
  },

  amount: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["cash", "upi", "card", "online"],
    required: true
  },

  transactionId: {
    type: String
  },

  paymentStatus: {
    type: String,
    enum: ["success", "pending", "failed"],
    default: "success"
  },

  paidAt: {
    type: Date,
    default: Date.now
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);