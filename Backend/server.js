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
      console.log("✅ MongoDB connected successfully");
      return;
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Initialize database connection
connectDB().catch((err) => {
  console.error("❌ Could not connect to MongoDB:", err);
  process.exit(1);
});

// Enable Mongoose debug mode to log database queries to the console
// mongoose.set("debug", true);

// Middleware setup
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://127.0.0.1:5501"],
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

// Admin Routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const multer = require("multer"); // Locally require for error checking
  console.error("❌ Error:", err.message);
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
    console.log("✅ MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
