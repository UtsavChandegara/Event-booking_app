const User = require("../models/User");
const Booking = require("../models/Booking");
const bcrypt = require("bcryptjs");

const userController = {
  // GET /api/users/profile
  getProfile: async (req, res) => {
    try {
      // req.user.userId is attached by the authMiddleware
      const user = await User.findById(req.user.userId).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // PUT /api/users/profile
  updateProfile: async (req, res) => {
    const { username, email, phone, city } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for uniqueness if username/email are being changed
      if (username && username !== user.username) {
        if (await User.findOne({ username })) {
          return res.status(400).json({ message: "Username is already taken" });
        }
        user.username = username;
      }
      if (email && email !== user.email) {
        if (await User.findOne({ email })) {
          return res.status(400).json({ message: "Email is already in use" });
        }
        user.email = email;
      }

      // Update other fields (add them to your User model if they don't exist)
      if (phone !== undefined) user.phone = phone;
      if (city !== undefined) user.city = city;

      const updatedUser = await user.save();
      updatedUser.password = undefined; // Don't send password back

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // PUT /api/users/change-password
  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }

      // The pre-save hook in the User model will hash the new password
      user.password = newPassword;
      await user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // GET /api/users/bookings
  getUserBookings: async (req, res) => {
    const userId = req.user.userId;
    const { status } = req.query; // ?status=upcoming or ?status=past

    try {
      const bookings = await Booking.find({ user: userId })
        .populate("event")
        .sort({ createdAt: -1 });

      if (!status) {
        return res.json(bookings);
      }

      // Filter bookings based on event date
      const now = new Date();
      const filteredBookings = bookings.filter((b) => {
        if (!b.event) return false; // Skip bookings with deleted events
        const eventDate = new Date(b.event.date);
        if (status === "upcoming") return eventDate >= now;
        if (status === "past") return eventDate < now;
        return false;
      });

      res.json(filteredBookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = userController;
