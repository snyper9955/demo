const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
{
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true
  },

  planName: {
    type: String,
    enum: ["daily", "monthly", "quarterly", "yearly"],
    required: true
  },

  timeSlot: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["active", "pending", "expired", "cancelled"],
    default: "active"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  expiryNotificationSent: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Membership", membershipSchema);
