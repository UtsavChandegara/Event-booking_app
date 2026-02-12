const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const authController = require("../controllers/authController");
const jwt = require("jsonwebtoken");

// This middleware protects routes by checking for a valid token.
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const token = authHeader.split(" ")[1];
    // Make sure you have JWT_SECRET in your .env file
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adds { userId, role } to the request object
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Route for user registration
router.post(
  "/register",
  [
    check("username", "Username is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be 6 or more characters").isLength({
      min: 6,
    }),
  ],
  authController.register,
);

// Route for user login
router.post("/login", authController.login);

// Route for initiating password reset
router.post("/forgot-password", authController.forgotPassword);

// Route for resetting password with a token
router.post("/reset-password", authController.resetPassword);

// THE MISSING ROUTE: Route for requesting organizer role
router.post(
  "/request-organizer-role",
  authMiddleware,
  authController.requestOrganizerRole,
);

module.exports = router;
