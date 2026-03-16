const mongoose = require("mongoose");
const User = require("./src/models/User");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const email = "chemistryhero1@gmail.com";
    const password = "995546";

    let user = await User.findOne({ email });

    if (user) {
      console.log("User found, updating role to admin...");
      user.role = "admin";
      // We should also ensure the password is what they expect (9955)
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();
      console.log("User updated successfully.");
    } else {
      console.log("User not found, creating new admin user...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      user = await User.create({
        name: "Admin",
        email,
        password: hashedPassword,
        role: "admin"
      });
      console.log("Admin user created successfully.");
    }

    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
