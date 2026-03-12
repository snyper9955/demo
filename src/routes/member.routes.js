const express = require("express");
const router = express.Router();
const {
  createMember,
  getMemberByUser,
  updateMember
} = require("../controller/member.controller");

router.post("/", createMember);
router.get("/user/:userId", getMemberByUser);
router.put("/:id", updateMember);

module.exports = router;
