const crypto = require("crypto");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const EntryLog = require("../models/EntryLog");

const canScanEvent = async (scannerUser, eventId) => {
  if (scannerUser.role === "admin") return true;
  if (scannerUser.role !== "organizer") return false;
  const event = await Event.findById(eventId).select("createdBy");
  if (!event) return false;
  return event.createdBy.toString() === scannerUser.userId;
};

const getMyTickets = async (req, res) => {
  try {
    const { bookingId } = req.query;
    const query = { user: req.user.userId };
    if (bookingId) query.booking = bookingId;

    const tickets = await Ticket.find(query)
      .populate("event", "title date location")
      .sort({ createdAt: -1 });

    return res.json(tickets);
  } catch (error) {
    console.error("Get My Tickets Error:", error);
    return res.status(500).json({ message: "Failed to fetch tickets." });
  }
};

const generateDynamicQr = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId).populate("event", "title");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }
    if (ticket.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized." });
    }
    if (ticket.status !== "ACTIVE") {
      return res.status(400).json({ message: `Ticket is ${ticket.status}.` });
    }

    if (!ticket.qrCode) {
      ticket.qrCode = `QR-${crypto.randomBytes(16).toString("base64url")}`;
      await ticket.save();
    }

    return res.json({
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      event: ticket.event,
      qrToken: ticket.qrCode,
    });
  } catch (error) {
    console.error("Generate Dynamic QR Error:", error);
    return res.status(500).json({ message: "Failed to generate QR." });
  }
};

const verifyAndUseTicket = async (req, res) => {
  try {
    const { qrToken, gateLocation } = req.body;

    if (!qrToken || !gateLocation) {
      return res
        .status(400)
        .json({ message: "qrToken and gateLocation are required." });
    }

    const ticketForAuth = await Ticket.findOne({
      qrCode: qrToken,
      status: "ACTIVE",
    }).select("event");

    if (!ticketForAuth) {
      return res.status(400).json({ message: "Invalid, used, or cancelled QR token." });
    }

    const allowed = await canScanEvent(req.user, ticketForAuth.event);
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized to scan this event." });
    }

    const updatedTicket = await Ticket.findOneAndUpdate(
      {
        _id: ticketForAuth._id,
        status: "ACTIVE",
        qrCode: qrToken,
      },
      {
        $set: {
          status: "USED",
          usedAt: new Date(),
          gateLocation,
          usedBy: req.user.userId,
        },
      },
      { new: true },
    )
      .populate("event", "title")
      .populate("user", "username email")
      .populate("booking", "tickets");

    if (!updatedTicket) {
      return res.status(409).json({
        message: "Ticket is already used, invalid, or QR has been refreshed.",
      });
    }

    await EntryLog.create({
      event: updatedTicket.event._id,
      user: updatedTicket.user._id,
      ticket: updatedTicket._id,
      booking: updatedTicket.booking._id,
      gateLocation,
      scannedBy: req.user.userId,
      scannedAt: updatedTicket.usedAt,
    });

    return res.json({
      message: "Entry granted.",
      ticket: {
        id: updatedTicket._id,
        ticketNumber: updatedTicket.ticketNumber,
        status: updatedTicket.status,
        usedAt: updatedTicket.usedAt,
        gateLocation: updatedTicket.gateLocation,
        user: updatedTicket.user,
        event: updatedTicket.event,
        booking: updatedTicket.booking,
      },
    });
  } catch (error) {
    console.error("Verify And Use Ticket Error:", error);
    return res.status(500).json({ message: "Ticket verification failed." });
  }
};

const getEntryRecords = async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) {
      return res.status(400).json({ message: "eventId query is required." });
    }

    const allowed = await canScanEvent(req.user, eventId);
    if (!allowed) {
      return res
        .status(403)
        .json({ message: "Not authorized to view entry records for this event." });
    }

    const logs = await EntryLog.find({ event: eventId })
      .populate("user", "username email")
      .populate("ticket", "ticketNumber")
      .populate("booking", "tickets")
      .populate("scannedBy", "username role")
      .sort({ scannedAt: -1 });

    const attendeesMap = new Map();
    logs.forEach((log) => {
      const userId = log.user?._id?.toString();
      if (!userId) return;
      if (!attendeesMap.has(userId)) {
        attendeesMap.set(userId, {
          userId,
          username: log.user.username,
          email: log.user.email,
          checkedInTickets: 0,
          totalBookedTickets: log.booking?.tickets || 0,
          lastEntryTime: log.scannedAt,
        });
      }
      const entry = attendeesMap.get(userId);
      entry.checkedInTickets += 1;
      entry.totalBookedTickets = Math.max(
        entry.totalBookedTickets,
        log.booking?.tickets || 0,
      );
      if (!entry.lastEntryTime || log.scannedAt > entry.lastEntryTime) {
        entry.lastEntryTime = log.scannedAt;
      }
    });

    return res.json({
      summary: {
        totalEntries: logs.length,
        uniqueAttendees: attendeesMap.size,
      },
      attendeeSummary: Array.from(attendeesMap.values()),
      records: logs.map((log) => ({
        id: log._id,
        scannedAt: log.scannedAt,
        gateLocation: log.gateLocation,
        attendee: log.user,
        ticketNumber: log.ticket?.ticketNumber || null,
        bookedTickets: log.booking?.tickets || 0,
        scannedBy: log.scannedBy,
      })),
    });
  } catch (error) {
    console.error("Get Entry Records Error:", error);
    return res.status(500).json({ message: "Failed to fetch entry records." });
  }
};

module.exports = {
  getMyTickets,
  generateDynamicQr,
  verifyAndUseTicket,
  getEntryRecords,
};
