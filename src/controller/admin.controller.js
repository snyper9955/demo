const User = require("../models/User");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");
const sendWhatsApp = require("../utils/sendWhatsApp");
const { calculateEndDate } = require("../utils/dateUtils");


// @desc    Get top-level dashboard statistics for Admin
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalTrainers = await User.countDocuments({ role: "trainer" });
    const activeSubscriptions = await Membership.countDocuments({ 
      status: "active",
      endDate: { $gte: new Date() } 
    });

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
        let memberStatus = member ? member.status : "inactive";

        if (member) {
            let activeMembership = await Membership.findOne({ 
                member: member._id, 
                status: { $in: ["active", "pending"] } 
            }).sort({ createdAt: -1 });

            if (activeMembership) {
                subscriptionStatus = activeMembership.planName;
                if (activeMembership.status === "pending") {
                    subscriptionStatus += " (Pending)";
                }
                subscriptionEnd = activeMembership.endDate;
                
                if (!timeSlot) timeSlot = activeMembership.timeSlot || null;
                membershipId = activeMembership._id;
            } else {
                subscriptionStatus = "Inactive";
            }
        }

        if (u.role === "trainer") {
            subscriptionStatus = "Trainer";
        }

        // Return sensitive info only to admins
        const isAdmin = req.user && req.user.role === 'admin';

        return {
            _id: u._id,
            memberProfileId: member ? member._id : null,
            memberId,
            name: u.name || "Unknown",
            role: u.role,
            subscriptionStatus,
            subscriptionEnd,
            timeSlot,
            timeSlots: timeSlots || [],
            trainerAssigned: member?.trainerAssigned?.name || null,
            memberStatus,
            // Sensitive fields - Admin only
            ...(isAdmin && {
                email: u.email || "Unknown",
                phone: u.phone || "N/A",
                emergencyContact: member ? member.emergencyContact : null,
                trainerAssignedId: member?.trainerAssigned?._id || null,
                membershipId,
            }),
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
// @desc    Manually activate a pending membership (e.g., cash payment)
// @route   PUT /api/admin/membership/:id/activate
// @access  Private (Admin Only)
exports.activateMembershipManually = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Manual activation requested for membership ID: ${id}`);

    const membership = await Membership.findById(id).populate({
      path: "member",
      populate: { path: "user" }
    });

    if (!membership) {
      console.log(`Membership with ID ${id} not found.`);
      return res.status(404).json({ message: "Membership not found" });
    }

    console.log(`Found membership. Status: ${membership.status}, Member: ${membership.member?._id}`);

    if (membership.status !== "pending") {
      console.log(`Activation denied: Status is ${membership.status}, not pending.`);
      return res.status(400).json({ message: "Only pending memberships can be manually activated" });
    }

    // Update status to active and RECALCULATE end date from now
    const newStartDate = new Date();
    const newEndDate = calculateEndDate(newStartDate, membership.planName);
    
    membership.status = "active";
    membership.startDate = newStartDate;
    membership.endDate = newEndDate;
    
    await membership.save();

    // Also ensure the Member profile is marked as active
    if (membership.member && membership.member.status !== "active") {
      membership.member.status = "active";
      await membership.member.save();
    }

    // Create a Payment record for the manual activation
    try {
      await Payment.create({
        member: membership.member._id,
        membership: membership._id,
        amount: membership.price || 99,
        paymentMethod: "cash",
        transactionId: `manual_${Date.now()}`,
        paymentStatus: "success",
        paidAt: new Date(),
      });
      console.log(`Payment record created for manual activation of membership ${id}`);
    } catch (payErr) {
      console.error("Failed to create payment record for manual activation:", payErr.message);
    }

    console.log(`Membership ${id} saved as active. New End Date: ${newEndDate}`);

    // Send WhatsApp notification
    try {
      if (membership.member && membership.member.user && membership.member.user.phone) {
        console.log(`Sending WhatsApp notification to ${membership.member.user.phone}`);
        const msg = `✅ Hi ${membership.member.user.name}, your ${membership.planName} membership has been manually activated by Admin! It is now valid until ${newEndDate.toLocaleDateString()}.`;
        await sendWhatsApp(membership.member.user.phone, msg);
      } else {
        console.log("No user phone found for notification.");
      }
    } catch (msgErr) {
      console.error("Manual activation notification error:", msgErr.message);
    }

    res.status(200).json({ message: "Membership activated manually", membership });
  } catch (error) {
    console.error("!!! CRITICAL ERROR in activateMembershipManually !!!");
    console.error("Stack Trace:", error.stack);
    res.status(500).json({ 
      message: "Error activating membership", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};
