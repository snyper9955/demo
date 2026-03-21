const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllMembersData,
  getAllTrainers,
  activateMembershipManually,
  sendPaymentReminder,
  sendBulkPaymentReminders
} = require("../controller/admin.controller");

const { protect, admin } = require("../middleware/auth.middleware");

// Get master list of all members (Accessible to all authenticated users)
router.get("/members", protect, getAllMembersData);

// Protected Admin-only routes
router.use(protect);
router.use(admin);

router.get("/stats", getDashboardStats);
router.get("/trainers", getAllTrainers);
router.put("/membership/:id/activate", activateMembershipManually);
router.post("/membership/:id/send-reminder", sendPaymentReminder);
router.post("/members/send-bulk-reminders", sendBulkPaymentReminders);

module.exports = router;
