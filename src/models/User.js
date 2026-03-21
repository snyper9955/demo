const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true,
    select: false
  },

  name: String,

  phone: String,

  gender: {
    type: String,
    enum: ["male","female","other"]
  },

  address: String,

  dateOfBirth: Date,
  height: String,
  weight: String,

  role: {
    type: String,
    enum: ["admin","trainer","member","visitor"],
    default: "visitor"
  }

}, {timestamps:true})

module.exports = mongoose.model("User", userSchema);