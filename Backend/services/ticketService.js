const crypto = require("crypto");
const Ticket = require("../models/Ticket");

const buildTicketNumber = () => `TKT-${Date.now()}-${crypto.randomInt(100000, 999999)}`;
const buildQrCode = () => `QR-${crypto.randomBytes(16).toString("base64url")}`;

const issueTicketsForBooking = async ({ bookingId, eventId, userId, count }) => {
  const tickets = Array.from({ length: count }, () => ({
    booking: bookingId,
    event: eventId,
    user: userId,
    ticketNumber: buildTicketNumber(),
    qrCode: buildQrCode(),
    status: "ACTIVE",
  }));

  return Ticket.insertMany(tickets);
};

module.exports = {
  issueTicketsForBooking,
};
