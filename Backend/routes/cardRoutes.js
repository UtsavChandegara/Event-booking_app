const express = require("express");
const auth = require("../middleware/authMiddleware");
const cardController = require("../controllers/cardController");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const referenceUploadsDir = path.join(
  __dirname,
  "../uploads",
  "experience-cards",
  "references",
);
fs.mkdirSync(referenceUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, referenceUploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public share endpoint
router.get("/share/:shareToken", cardController.getSharedCard);
router.post("/share/:shareToken/download", cardController.markSharedCardDownloaded);

router.use(auth);

// User card endpoints
router.get("/eligible", cardController.getEligibleCards);
router.post("/create", upload.single("selfie"), cardController.createCard);
router.get("/my", cardController.getMyCards);
router.post("/:cardId/share", cardController.markCardShared);
router.post("/:cardId/download", cardController.markCardDownloaded);

// Organizer/admin analytics
router.get("/analytics/event/:eventId", cardController.getEventAnalytics);

module.exports = router;
