const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    let user = req.user;

    // If req.user is from the lightweight auth middleware (has userId but no role)
    if (user && user.userId && !user.role) {
      user = await User.findById(user.userId);
    }

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Server error checking admin status" });
  }
};
