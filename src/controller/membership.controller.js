const Membership = require("../models/Membership");
const Member = require("../models/Member");
const User = require("../models/User");
const sendWhatsApp = require("../utils/sendWhatsApp");
const { calculateEndDate } = require("../utils/dateUtils");

// @desc    Create a new membership
// @route   POST /api/memberships
// @access  Private (Assume Protected)
exports.createMembership = async (req, res) => {
  try {
    const { memberId, planName, price, startDate, timeSlot, status } = req.body;

    if (!timeSlot) {
      return res.status(400).json({ message: "Time slot is required" });
    }

    // Robust Member lookup: 
    // If memberId is a Member ID, great. 
    // If it's a User ID, find or create the Member profile.
    let memberExists = await Member.findById(memberId);
    
    if (!memberExists) {
      // Check if maybe it's a User ID
      memberExists = await Member.findOne({ user: memberId });
      
      if (!memberExists) {
        // Check if a User exists with this ID
        const user = await User.findById(memberId);
        if (user) {
          // Auto-create Member profile for this User
          const generatedMemberId = 'M' + Math.floor(100000 + Math.random() * 900000).toString();
          memberExists = await Member.create({
            user: user._id,
            memberId: generatedMemberId,
            status: "active"
          });
        }
      }
    }

    if (!memberExists) {
      return res.status(404).json({ message: "Member profile not found and could not be created." });
    }

    // Ensure member is active if they were previously inactive/cancelled
    if (memberExists.status !== "active") {
      memberExists.status = "active";
      await memberExists.save();
    }

    // Ensure we use the actual Member document ID for the membership record
    const actualMemberId = memberExists._id;

    const start = startDate ? new Date(startDate) : new Date();
    const endDate = calculateEndDate(start, planName);

    // Validate slot capacity
    const activeInSlot = await Membership.countDocuments({
      timeSlot,
      status: { $in: ["active", "pending"] }
    });

    if (activeInSlot >= 20) {
      return res.status(400).json({ message: "Selected time slot is fully booked." });
    }

    const membership = await Membership.create({
      member: actualMemberId,
      planName,
      price,
      startDate: start,
      timeSlot,
      endDate,
      status: status || "pending", // Default to pending until payment is verified
      // createdBy: req.user._id // (Assuming an auth middleware injecting user)
    });

    // Send WhatsApp Notification to User & Admin
    try {
      const user = await User.findById(memberExists.user);
      const userMsg = `👋 Hi ${user.name}, your ${membership.planName} plan has been assigned! Status: Pending Payment. Log in to your dashboard to activate.`;
      const adminMsg = `🎟️ Plan Assigned!\n\nUser: ${user.name}\nPlan: ${membership.planName}\nStatus: Pending`;
      
      if (user.phone) await sendWhatsApp(user.phone, userMsg);
      await sendWhatsApp(process.env.ADMIN_WHATSAPP_NUMBER, adminMsg);
    } catch (msgErr) {
      console.error("Membership notification error:", msgErr.message);
    }

    res.status(201).json(membership);
  } catch (error) {
    res.status(500).json({ message: "Error creating membership", error: error.message });
  }
};

// @desc    Get available 1-hour slots and their capacities
// @route   GET /api/memberships/slots
// @access  Public or Private
exports.getAvailableSlots = async (req, res) => {
  try {
    const MAX_CAPACITY = 20;
    
    // Generate 24 slots: "00:00-01:00", "01:00-02:00", ..., "23:00-00:00"
    const slots = [];
    for (let i = 0; i < 24; i++) {
      const startHour = i.toString().padStart(2, '0');
      const endHour = ((i + 1) % 24).toString().padStart(2, '0');
      slots.push(`${startHour}:00-${endHour}:00`);
    }

    // Aggregate active and pending memberships grouped by timeSlot
    const activeCounts = await Membership.aggregate([
      { $match: { status: { $in: ["active", "pending"] } } },
      { $group: { _id: "$timeSlot", count: { $sum: 1 } } }
    ]);

    // Map counts back to slots
    const slotData = slots.map(slotName => {
      const countMatch = activeCounts.find(a => a._id === slotName);
      const booked = countMatch ? countMatch.count : 0;
      return {
        timeSlot: slotName,
        booked,
        available: MAX_CAPACITY - booked,
        isFull: booked >= MAX_CAPACITY
      };
    });

    res.status(200).json(slotData);

  } catch (error) {
    res.status(500).json({ message: "Error fetching slots", error: error.message });
  }
};

// @desc    Get all memberships
// @route   GET /api/memberships
// @access  Private
exports.getMemberships = async (req, res) => {
  try {
    // Populate the member details (which links to the user) to get nice UI data
    const memberships = await Membership.find().populate({
        path: 'member',
        populate: {
            path: 'user',
            select: 'name email phone'
        }
    });
    res.status(200).json(memberships);
  } catch (error) {
    res.status(500).json({ message: "Error fetching memberships", error: error.message });
  }
};

// @desc    Get a specific user's active membership
// @route   GET /api/memberships/user/:memberId
// @access  Private
exports.getUserMembership = async (req, res) => {
  try {
    const { memberId } = req.params;
    let membership = await Membership.findOne({ 
        member: memberId, 
        status: { $in: ["active", "pending"] } 
    }).sort({ createdAt: -1 });

    if (!membership) {
      // Return 200 with null instead of 404 to avoid browser console errors for new users
      return res.status(200).json(null);
    }

    res.status(200).json(membership);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user membership", error: error.message });
  }
};

// @desc    Update membership status (e.g., cancel it)
// @route   PUT /api/memberships/:id
// @access  Private
exports.updateMembershipStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // active, expired, cancelled

    const membership = await Membership.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    // If membership is cancelled, set the member profile status to inactive
    if (status === "cancelled") {
      await Member.findByIdAndUpdate(membership.member, { status: "inactive" });
    }

    res.status(200).json(membership);
  } catch (error) {
    res.status(500).json({ message: "Error updating membership", error: error.message });
  }
};
