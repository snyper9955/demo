const Attendance = require("../models/Attendance");
const Member = require("../models/Member");
const Membership = require("../models/Membership");

// @desc    Record a check-in for a member
// @route   POST /api/attendance/checkin
// @access  Private
exports.recordCheckIn = async (req, res) => {
  try {
    const { memberId, method } = req.body;

    // Verify member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: "Member not found. Check-in denied." });
    }

    // Check if the member has an active, non-expired membership
    const activeMembership = await Membership.findOne({
      member: memberId,
      status: "active",
      endDate: { $gte: new Date() }
    });

    if (!activeMembership) {
      return res.status(403).json({ 
        message: "Check-in denied. You do not have an active membership. It may have expired or is pending payment." 
      });
    }

    // Check if there is already an open attendance record for today (no checkOutTime)
    // We look for records created today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingOpenRecord = await Attendance.findOne({
      member: memberId,
      date: { $gte: startOfDay, $lte: endOfDay },
      checkOutTime: { $exists: false }
    });

    if (existingOpenRecord) {
      return res.status(400).json({ 
        message: "You are already checked in today.", 
        record: existingOpenRecord 
      });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      member: memberId,
      method: method || "manual", // Could be 'qr' if sent from scanner
      status: "present",
      checkInTime: new Date()
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: "Error recording check-in", error: error.message });
  }
};

// @desc    Record a check-out for a member
// @route   PUT /api/attendance/checkout
// @access  Private
exports.recordCheckOut = async (req, res) => {
  try {
    const { memberId } = req.body;

    // Find the currently open record for this member today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const openRecord = await Attendance.findOne({
      member: memberId,
      date: { $gte: startOfDay },
      checkOutTime: { $exists: false }
    });

    if (!openRecord) {
      return res.status(404).json({ message: "No active check-in found to check out from." });
    }

    // Update with checkOutTime
    openRecord.checkOutTime = new Date();
    await openRecord.save();

    res.status(200).json(openRecord);
  } catch (error) {
    res.status(500).json({ message: "Error recording check-out", error: error.message });
  }
};

// @desc    Get all attendance records for a specific member
// @route   GET /api/attendance/member/:memberId
// @access  Private
exports.getMemberAttendance = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Fetch records, sorted newest to oldest
    const records = await Attendance.find({ member: memberId })
      .sort({ date: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: "Error fetching attendance records", error: error.message });
  }
};
