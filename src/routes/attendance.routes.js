const express = require("express");
const router = express.Router();
const {
  recordCheckIn,
  recordCheckOut,
  getMemberAttendance
} = require("../controller/attendance.controller");

router.post("/checkin", recordCheckIn);
router.put("/checkout", recordCheckOut);
router.get("/member/:memberId", getMemberAttendance);

module.exports = router;
