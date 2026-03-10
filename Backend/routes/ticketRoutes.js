const express = require("express");
const auth = require("../middleware/authMiddleware");
const ticketController = require("../controllers/ticketController");

const router = express.Router();

router.use(auth);

// GET /api/tickets/my?bookingId=<id>
router.get("/my", ticketController.getMyTickets);

// GET /api/tickets/entry-records?eventId=<id>
router.get("/entry-records", ticketController.getEntryRecords);

// GET /api/tickets/:ticketId/qr
router.get("/:ticketId/qr", ticketController.generateDynamicQr);

// POST /api/tickets/scan/verify
router.post("/scan/verify", ticketController.verifyAndUseTicket);

module.exports = router;
