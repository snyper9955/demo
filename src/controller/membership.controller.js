const Membership = require("../models/membership");
const Member = require("../models/Member");
const User = require("../models/User");

// Helper function to calculate end date based on plan name
const calculateEndDate = (startDate, planName) => {
  const start = new Date(startDate);
  switch (planName) {
    case "daily":
      return new Date(start.setDate(start.getDate() + 1)); 
    case "monthly":
      return new Date(start.setMonth(start.getMonth() + 1));
    case "quarterly":
      return new Date(start.setMonth(start.getMonth() + 3));
    case "yearly":
      return new Date(start.setFullYear(start.getFullYear() + 1));
    default:
      return new Date(start.setMonth(start.getMonth() + 1)); 
  }
};

// @desc    Create a new membership
// @route   POST /api/memberships
// @access  Private (Assume Protected)
exports.createMembership = async (req, res) => {
  try {
    const { memberId, planName, price, startDate, timeSlot } = req.body;

    if (!timeSlot) {
      return res.status(400).json({ message: "Time slot is required" });
    }

    // Optional: Validate if the member exists before creating membership
    const memberExists = await Member.findById(memberId);
    if (!memberExists) {
      return res.status(404).json({ message: "Member not found" });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const endDate = calculateEndDate(start, planName);

    // Validate slot capacity
    const activeInSlot = await Membership.countDocuments({
      timeSlot,
      status: "active"
    });

    if (activeInSlot >= 20) {
      return res.status(400).json({ message: "Selected time slot is fully booked." });
    }

    const membership = await Membership.create({
      member: memberId,
      planName,
      price,
      startDate: start,
      timeSlot,
      endDate,
      status: "active",
      // createdBy: req.user._id // (Assuming an auth middleware injecting user)
    });

    // Reactivate member profile if it was inactive (renewal)
    memberExists.status = "active";
    await memberExists.save();

    // Automatically upgrade the User's role to 'member' when they purchase a plan
    const user = await User.findById(memberExists.user);
    if (user && user.role === "visitor") {
      user.role = "member";
      await user.save();
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

    // Aggregate active memberships grouped by timeSlot
    const activeCounts = await Membership.aggregate([
      { $match: { status: "active" } },
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
    });

    if (!membership) {
      // Return 200 with null instead of 404 to avoid browser console errors for new users
      return res.status(200).json(null);
    }

    // Check for expiration on-the-fly for the user (read-only)
    if (membership.endDate < new Date()) {
      // In a real system, you might trigger a cleanup here, but for now just return it as expired
      // or filter it out so the UI shows "No Active Subscription"
      return res.status(200).json({ ...membership.toObject(), status: "expired" });
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

    res.status(200).json(membership);
  } catch (error) {
    res.status(500).json({ message: "Error updating membership", error: error.message });
  }
};
