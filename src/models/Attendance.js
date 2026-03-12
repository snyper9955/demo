// const mongoose = require("mongoose");

// const attendanceSchema = new mongoose.Schema(
// {
//   member: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Member",
//     required: true
//   },

//   date: {
//     type: Date,
//     default: Date.now
//   },

//   checkInTime: {
//     type: Date,
//     default: Date.now
//   },

//   checkOutTime: {
//     type: Date
//   },

//   recordedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User"
//   },

//   method: {
//     type: String,
//     enum: ["manual", "qr", "fingerprint"],
//     default: "manual"
//   },

//   status: {
//     type: String,
//     enum: ["present", "absent"],
//     default: "present"
//   }

// },
// { timestamps: true }
// );

// module.exports = mongoose.model("Attendance", attendanceSchema);