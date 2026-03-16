const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");

      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (
    req.user &&
    req.user.role === "admin" &&
    req.user.email === "chemistryhero1@gmail.com"
  ) {
    next();
  } else {
    res.status(403).json({
      message: "Not authorized as an admin or invalid admin email",
    });
  }
};

module.exports = { protect, admin };
