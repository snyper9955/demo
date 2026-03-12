const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllMembersData,
  getAllTrainers
} = require("../controller/admin.controller");

// NOTE: In a production app, you would add an admin auth middleware here 
// to verify req.user.role === 'admin' before granting access.

router.get("/stats", getDashboardStats);
router.get("/members", getAllMembersData);
router.get("/trainers", getAllTrainers);

module.exports = router;
