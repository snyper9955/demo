const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const User = require("../models/User");
const sendWhatsApp = require("../utils/sendWhatsApp");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc   Create a Razorpay order
// @route  POST /api/payments/create-order
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Invalid amount provided" });
    }

    const options = {
      amount: amount * 100, // amount in paise
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
        amount: amount || 2, // default ₹2
        paymentMethod: "online",
        transactionId: razorpay_payment_id,
        paymentStatus: "success",
      });

      // ACTIVATE MEMBERSHIP AND UPDGRADE USER ROLE
      if (membershipId) {
        const membership = await Membership.findById(membershipId);
        if (membership) {
          membership.status = "active";
          await membership.save();

          // Activate Member profile
          const member = await Member.findById(memberId);
          if (member) {
            member.status = "active";
            await member.save();

            // Upgrade User Role if visitor
            const user = await User.findById(member.user);
            if (user && user.role === "visitor") {
              user.role = "member";
              await user.save();
            }

            // Send WhatsApp Notification
            const userMsg = `✨ Welcome to the family, ${user.name}! Your ${membership.planName} membership is now ACTIVE. See you at the iron!`;
            const adminMsg = `💰 Payment Verified & Plan Activated!\n\nUser: ${user.name}\nPlan: ${membership.planName}\nAmount: ₹${amount || 99}`;
            
            if (user.phone) await sendWhatsApp(user.phone, userMsg);
            await sendWhatsApp(process.env.ADMIN_WHATSAPP_NUMBER, adminMsg);
          }
        }
      }

    } catch (saveErr) {
      // Don't fail the whole flow if save fails — log and continue
      console.error("Payment record save or activation error:", saveErr.message);
    }

    res.status(200).json({ success: true, paymentId: razorpay_payment_id });
  } catch (error) {
    res.status(500).json({ message: "Verification error", error: error.message });
  }
};

// @desc   Get payment history for a specific member
// @route  GET /api/payments/member/:memberId
exports.getMemberPayments = async (req, res) => {
  try {
    const { memberId } = req.params;
    const payments = await Payment.find({ member: memberId })
      .populate("membership", "planName")
      .sort({ createdAt: -1 });
    
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payment history", error: error.message });
  }
};
