const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllMembersData,
  getAllTrainers
} = require("../controller/admin.controller");

const { protect, admin } = require("../middleware/auth.middleware");

// Apply protection to all admin routes
router.use(protect);
router.use(admin);

router.get("/stats", getDashboardStats);
router.get("/members", getAllMembersData);
router.get("/trainers", getAllTrainers);

module.exports = router;
