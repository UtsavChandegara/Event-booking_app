const mongoose = require("mongoose");

mongoose
  .connect("mongodb://127.0.0.1:27017/eventify")
  .then(() => {
    console.log("✅ Successfully connected to MongoDB.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Connection error:", err);
    process.exit(1);
  });
