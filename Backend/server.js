require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const app = express();

// Enhanced MongoDB connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/eventify");
      console.log("âœ… MongoDB connected successfully");
      return;
    } catch (error) {
      console.error(`âŒ Connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Initialize database connection
connectDB().catch((err) => {
  console.error("âŒ Could not connect to MongoDB:", err);
  process.exit(1);
});

// Enable Mongoose debug mode to log database queries to the console
// mongoose.set("debug", true);

// Middleware setup
const allowedOriginPattern =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOriginPattern.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  }),
);
app.use(express.json());

// Serve the 'uploads' directory statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Serve Frontend static files (Fixes "Cannot GET /..." errors)
app.use(express.static(path.join(__dirname, "../Frontend")));

// API Routes
const eventRoutes = require("./routes/eventRoutes");
app.use("/api/events", eventRoutes);

// Auth Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// User Profile Routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Booking Routes
const bookingRoutes = require("./routes/bookingRoutes");
app.use("/api/bookings", bookingRoutes);

// Dummy Payment Routes
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

// Ticket Routes
const ticketRoutes = require("./routes/ticketRoutes");
app.use("/api/tickets", ticketRoutes);

// Experience Card Routes
const cardRoutes = require("./routes/cardRoutes");
app.use("/api/cards", cardRoutes);

// Admin Routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const multer = require("multer"); // Locally require for error checking
  console.error("âŒ Error:", err.message);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File size is too large. Max limit is 5MB" });
    }
  }
  res.status(err.status || 500).json({
    error: err.message || "Something went wrong!",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    console.log("âœ… MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("âŒ Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ðŸš€ Server running on port ${PORT}`);
});
