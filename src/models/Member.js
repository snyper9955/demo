const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  memberId: {
    type: String,
    unique: true
  },

  emergencyContact: {
    name: String,
    phone: String
  },

  trainerAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  timeSlots: {
    type: [String],
    default: []
  },

  joinDate: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: ["active", "inactive", "banned"],
    default: "active"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Member", memberSchema);