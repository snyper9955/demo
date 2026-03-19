const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load ENV from current directory
dotenv.config();

const Member = require("./src/models/Member");
const Membership = require("./src/models/Membership");

const fixMemberStatuses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Find all memberships that are active or pending
    const activeMemberships = await Membership.find({ status: { $in: ["active", "pending"] } });
    const activeMemberIds = activeMemberships.map(m => m.member.toString());

    // Filter unique member IDs
    const uniqueActiveMemberIds = [...new Set(activeMemberIds)];

    console.log(`Found ${uniqueActiveMemberIds.length} members with active/pending memberships.`);

    // Update these members to be 'active'
    const result = await Member.updateMany(
      { _id: { $in: uniqueActiveMemberIds }, status: "inactive" },
      { $set: { status: "active" } }
    );

    console.log(`Fixed ${result.modifiedCount} members.`);
    process.exit(0);
  } catch (error) {
    console.error("Error fixing member statuses:", error);
    process.exit(1);
  }
};

fixMemberStatuses();
