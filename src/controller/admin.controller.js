const User = require("../models/User");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");

// @desc    Get top-level dashboard statistics for Admin
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalTrainers = await User.countDocuments({ role: "trainer" });
    const activeSubscriptions = await Membership.countDocuments({ status: "active" });

    // Sum all successful payment amounts
    const revenueResult = await Payment.aggregate([
      { $match: { paymentStatus: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.status(200).json({
      totalUsers,
      totalMembers,
      totalTrainers,
      activeSubscriptions,
      totalRevenue,
      todaysTotalVisits: 0,
      currentlyInside: 0
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching admin stats", error: error.message });
  }
};

// @desc    Get master list of all members with live status
// @route   GET /api/admin/members
// @access  Private (Admin Only)
exports.getAllMembersData = async (req, res) => {
  try {
    // 1. Fetch all users who are NOT admins
    const users = await User.find({ role: { $ne: "admin" } });

    // 2. Fetch all members and memberships to join with users
    const enhancedUsers = await Promise.all(users.map(async (u) => {
        const member = await Member.findOne({ user: u._id }).populate('trainerAssigned', 'name');
        
        let subscriptionStatus = "Visitor";
        let subscriptionEnd = null;
        let membershipId = null;
        let timeSlots = member ? (member.timeSlots && member.timeSlots.length > 0 ? member.timeSlots : (member.timeSlot ? [member.timeSlot] : [])) : [];
        let timeSlot = timeSlots.length > 0 ? timeSlots[0] : null;
        let memberId = member ? member.memberId : "N/A";

        if (member) {
            let activeMembership = await Membership.findOne({ 
                member: member._id, 
                status: { $in: ["active", "pending"] } 
            }).sort({ createdAt: -1 });

            if (activeMembership) {
                // If it's technically expired but still marked active, reflect it in status WITHOUT saving here
                if (activeMembership.endDate < new Date()) {
                    subscriptionStatus = "Expired";
                    subscriptionEnd = activeMembership.endDate;
                } else {
                    subscriptionStatus = activeMembership.planName;
                    if (activeMembership.status === "pending") {
                        subscriptionStatus += " (Pending)";
                    }
                    subscriptionEnd = activeMembership.endDate;
                }
                
                // If member doesn't have a direct timeSlot, fallback to membership
                if (!timeSlot) timeSlot = activeMembership.timeSlot || null;
                membershipId = activeMembership._id;
            } else {
                subscriptionStatus = "Inactive";
            }
        }

        if (u.role === "trainer") {
            subscriptionStatus = "Trainer";
        }

        return {
            _id: u._id,
            memberProfileId: member ? member._id : null,
            memberId,
            name: u.name || "Unknown",
            email: u.email || "Unknown",
            phone: u.phone || "N/A",
            role: u.role,
            emergencyContact: member ? member.emergencyContact : null,
            trainerAssigned: member?.trainerAssigned?.name || null,
            trainerAssignedId: member?.trainerAssigned?._id || null,
            subscriptionStatus,
            subscriptionEnd,
            timeSlot,
            timeSlots: timeSlots || [],
            membershipId,
            isInsideTheGym: false
        };
    }));

    res.status(200).json(enhancedUsers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching master list", error: error.message });
  }
};

// @desc    Get all users with trainer role
// @route   GET /api/admin/trainers
exports.getAllTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: "trainer" }, "name email");
    res.status(200).json(trainers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching trainers", error: error.message });
  }
};
