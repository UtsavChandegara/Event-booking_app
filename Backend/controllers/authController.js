const { validationResult } = require("express-validator");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const authController = {
  register: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, password, role, adminSecret } = req.body;

      // Security check: Require secret key for admin registration
      if (role === "admin") {
        const secretKey = process.env.ADMIN_SECRET || "admin123"; // Set ADMIN_SECRET in your .env file
        if (adminSecret !== secretKey) {
          return res
            .status(403)
            .json({ error: "Invalid admin secret key. Access denied." });
        }
      }

      const user = new User({
        username,
        email,
        password,
        role: role || "user",
      });
      await user.save();

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        },
      );

      res.status(201).json({ user, token });
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const message = `An account with this ${field} already exists.`;
        return res
          .status(400)
          .json({ errors: [{ path: field, msg: message }] });
      }
      res.status(500).json({ error: "Server error" });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error("Invalid login credentials");
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        },
      );

      res.json({ user, token });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate token
      const resetToken = crypto.randomBytes(20).toString("hex");

      // Hash token and save to database
      user.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      await user.save();

      // In a real app, send email here. For now, return the token or log it.
      let resetBaseUrl = "";

      if (req.headers.referer) {
        try {
          const refererUrl = new URL(req.headers.referer);
          const path = refererUrl.pathname.substring(
            0,
            refererUrl.pathname.lastIndexOf("/"),
          );
          resetBaseUrl = `${refererUrl.origin}${path}`;
        } catch (err) {
          console.error("Error parsing referer:", err);
        }
      }

      // Fallback: Use server's own host if referer is missing
      if (!resetBaseUrl) {
        resetBaseUrl = `${req.protocol}://${req.get("host")}`;
      }

      const resetUrl = `${resetBaseUrl}/reset-password.html?token=${resetToken}`;
      console.log(`Reset URL for ${email}: ${resetUrl}`);

      res.json({ message: "Reset link generated (check console)", resetUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  },

  requestOrganizerRole: async (req, res) => {
    try {
      // Assumes an auth middleware has run and set req.user.userId
      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      if (user.role === "organizer") {
        return res.status(400).json({ message: "You are already an organizer." });
      }

      if (user.role === "admin") {
        return res
          .status(400)
          .json({ message: "Admins cannot change their role." });
      }

      if (user.organizerRequestStatus === 'pending') {
        return res.status(400).json({ message: "You already have a pending request." });
      }

      // Set the request status to 'pending' for admin review
      user.organizerRequestStatus = "pending";
      await user.save();

      res.json({
        message: "Your request to become an organizer has been submitted for review.",
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error while submitting request." });
    }
  },
};

module.exports = authController;
