const express = require("express");
const cors = require("cors");

const app = express();
const authRoutes = require("./routes/auth.routes");
const membershipRoutes = require("./routes/membership.routes");
const memberRoutes = require("./routes/member.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const adminRoutes = require("./routes/admin.routes");
const paymentRoutes = require("./routes/payment.routes");

// Middleware
app.use(express.json());
app.use(cors());

// Test Route
app.get("/", (req, res) => {
  res.send("API Running...");
});

// Auth Routes
app.use("/api/auth", authRoutes);

// Membership Routes
app.use("/api/memberships", membershipRoutes);

// Member Routes
app.use("/api/members", memberRoutes);

// Attendance Routes
// app.use("/api/attendance", attendanceRoutes);

// Admin Routes
app.use("/api/admin", adminRoutes);

// Payment Routes
app.use("/api/payments", paymentRoutes);

module.exports = app;