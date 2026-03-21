const Member = require("../models/Member");
const User = require("../models/User");

// @desc    Create a new Member profile (and link it to a User)
// @route   POST /api/members
// @access  Private
exports.createMember = async (req, res) => {
  try {
    const { userId, emergencyContactName, emergencyContactPhone } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already a member
    const existingMember = await Member.findOne({ user: userId });
    if (existingMember) {
      return res.status(400).json({ message: "User already has a Member profile", member: existingMember });
    }

    // Generate a unique 6-digit member ID
    const memberId = 'M' + Math.floor(100000 + Math.random() * 900000).toString();

    // Create the Member profile
    const member = await Member.create({
      user: userId,
      memberId,
      emergencyContact: {
        name: emergencyContactName,
        phone: emergencyContactPhone
      },
      status: "active"
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ message: "Error creating member profile", error: error.message });
  }
};

// @desc    Get a specific user's Member profile
// @route   GET /api/members/user/:userId
// @access  Private
exports.getMemberByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // We populate user data so the frontend can display their name easily
    const member = await Member.findOne({ user: userId }).populate('user', 'name email phone');

    if (!member) {
      // Return 200 with null instead of 404 to avoid browser console errors for new users
      return res.status(200).json(null);
    }

    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ message: "Error fetching member profile", error: error.message });
  }
};

// @desc    Update a specific member profile (e.g. contact info)
// @route   PUT /api/members/:id
// @access  Private (Admin or Self)
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params; // This is the user ID now, based on my refactored frontend/backend logic
    const { emergencyContactName, emergencyContactPhone, trainerAssignedId, role, timeSlot, timeSlots, height, weight } = req.body;

    // 1. Update User Role if requested
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role && ["admin", "trainer", "member", "visitor"].includes(role)) {
      user.role = role;
    }

    if (height !== undefined) user.height = height;
    if (weight !== undefined) user.weight = weight;

    await user.save();

    // 2. Update Member Profile
    let member = await Member.findOne({ user: id });
    
    // Auto-create member profile if assigning a trainer or if user is a member/trainer
    if (!member && (trainerAssignedId || user.role === "member" || role === "trainer" || user.role === "trainer" || timeSlot || timeSlots)) {
      const memberId = 'M' + Math.floor(100000 + Math.random() * 900000).toString();
      member = await Member.create({
        user: id,
        memberId,
        status: "active"
      });
    }

    if (member) {
      if (emergencyContactName) member.emergencyContact.name = emergencyContactName;
      if (emergencyContactPhone) member.emergencyContact.phone = emergencyContactPhone;
      
      // Handle trainer assignment
      if (trainerAssignedId !== undefined) {
        member.trainerAssigned = trainerAssignedId === "" ? null : trainerAssignedId;
      }

      // Handle time slots assignment (trainer multi-slot support)
      if (timeSlots !== undefined || timeSlot !== undefined) {
        const slotsToApply = timeSlots || (timeSlot ? [timeSlot] : []);
        member.timeSlots = Array.isArray(slotsToApply) ? slotsToApply : [slotsToApply].filter(Boolean);
      }

      await member.save();
    }

    res.status(200).json({ user, member });
  } catch (error) {
    res.status(500).json({ message: "Error updating account", error: error.message });
  }
};
