const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Member = require("../models/Member");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc   Create a Razorpay order
// @route  POST /api/payments/create-order
exports.createOrder = async (req, res) => {
  try {
    const options = {
      amount: 9900, // ₹99 = 9900 paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
};

// @desc   Verify Razorpay signature and save Payment record
// @route  POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, memberId, membershipId, amount } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    // Save payment record to DB
    try {
      await Payment.create({
        member: memberId,
        membership: membershipId || undefined,
        amount: amount || 99, // default ₹99
        paymentMethod: "online",
        transactionId: razorpay_payment_id,
        paymentStatus: "success",
      });
    } catch (saveErr) {
      // Don't fail the whole flow if save fails — log and continue
      console.error("Payment record save error:", saveErr.message);
    }

    res.status(200).json({ success: true, paymentId: razorpay_payment_id });
  } catch (error) {
    res.status(500).json({ message: "Verification error", error: error.message });
  }
};
