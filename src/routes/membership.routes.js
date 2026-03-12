const express = require("express");
const router = express.Router();
const {
  createMembership,
  getMemberships,
  getUserMembership,
  updateMembershipStatus,
  getAvailableSlots
} = require("../controller/membership.controller");

// NOTE: Usually these are protected with an 'auth' middleware so strangers can't view all members
router.route("/")
  .post(createMembership)
  .get(getMemberships);

router.get("/slots", getAvailableSlots);

router.get("/user/:memberId", getUserMembership);
router.put("/:id", updateMembershipStatus);

module.exports = router;
