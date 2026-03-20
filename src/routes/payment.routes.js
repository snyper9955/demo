const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, getMemberPayments } = require("../controller/payment.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.get("/member/:memberId", protect, getMemberPayments);

module.exports = router;
