const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllMembersData,
  getAllTrainers
} = require("../controller/admin.controller");

const { protect, admin } = require("../middleware/auth.middleware");

// Get master list of all members (Accessible to all authenticated users)
router.get("/members", protect, getAllMembersData);

// Protected Admin-only routes
router.use(protect);
router.use(admin);

router.get("/stats", getDashboardStats);
router.get("/trainers", getAllTrainers);

module.exports = router;
