const User = require("../models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const sendWhatsApp = require("../utils/sendWhatsApp");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, gender, address, dateOfBirth, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      gender,
      address,
      dateOfBirth,
      role: role || "visitor",
    });

    if (user) {
      // Send WhatsApp Notification to Admin
      const adminMsg = `🔥 New User Registered at IronCore!\n\nName: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone || 'N/A'}\nRole: ${user.role}`;
      await sendWhatsApp(process.env.ADMIN_WHATSAPP_NUMBER, adminMsg);

      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select("+password"); // Need to explicitly select password since it has select: false

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Logout user (client should delete token)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Generate OTP and send it via email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Verify user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "There is no user with that email address." });
    }

    // Generate a random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing OTPs for this email to avoid confusion
    await Otp.deleteMany({ email });

    // Save newly generated OTP via the model
    await Otp.create({
      email,
      otp: otpCode,
    });

    // Send email with OTP
    const message = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nYour OTP code is: ${otpCode}\n\nThis code will expire in 5 minutes.`;

    try {
      console.log(`Checking Email Config... USER: ${process.env.EMAIL_USER ? 'Set' : 'Not Set'}, PASS: ${process.env.EMAIL_PASS ? 'Set' : 'Not Set'}`);
      
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendEmail({
          email: user.email,
          subject: "Password Reset OTP",
          message,
        });
      } else {
         console.log(`[DEVELOPMENT MODE] Email not configured in .env. The OTP for ${email} is: ${otpCode}`);
      }
      res.status(200).json({ message: "OTP sent to email" });
    } catch (error) {
      console.error("Forgot password email error:", error);
      await Otp.deleteMany({ email });
      return res.status(500).json({ message: "Email could not be sent", error: error.message || error.toString() });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Verify OTP and reset password
// @route   PUT /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Find the OTP document
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password and save it
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Delete the OTP as it has been used
    await Otp.deleteMany({ email });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.gender = req.body.gender || user.gender;
      user.address = req.body.address || user.address;
      user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        address: updatedUser.address,
        dateOfBirth: updatedUser.dateOfBirth,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
