const crypto = require("crypto");
const Payment = require("../models/Payment");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const { issueTicketsForBooking } = require("../services/ticketService");

const createPayment = async (req, res) => {
  try {
    const { eventId } = req.body;
    const tickets = Number(req.body.tickets);
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== "user") {
      return res.status(403).json({
        message: "Only attendee accounts can book tickets.",
      });
    }

    if (!eventId || !Number.isInteger(tickets) || tickets <= 0) {
      return res
        .status(400)
        .json({ message: "Valid eventId and ticket quantity are required." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const availableTickets = (event.totalTickets || 0) - (event.bookedTickets || 0);
    if (availableTickets < tickets) {
      return res.status(400).json({ message: "Not enough tickets available." });
    }

    const amount = Number(event.price) * tickets;
    const payment = new Payment({
      paymentId: `pay_dummy_${crypto.randomUUID()}`,
      user: userId,
      event: eventId,
      tickets,
      amount,
      status: "pending",
      provider: "dummy",
    });

    await payment.save();

    return res.status(201).json({
      message: "Dummy payment created.",
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        eventId,
        tickets,
      },
    });
  } catch (error) {
    console.error("Create Payment Error:", error);
    return res
      .status(500)
      .json({ message: "Server error while creating payment." });
  }
};

const simulatePaymentOutcome = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { outcome } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== "user") {
      return res.status(403).json({
        message: "Only attendee accounts can book tickets.",
      });
    }

    if (!["success", "failed"].includes(outcome)) {
      return res
        .status(400)
        .json({ message: "Outcome must be either 'success' or 'failed'." });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    if (payment.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized for this payment." });
    }

    if (["success", "failed"].includes(payment.status)) {
      return res.status(400).json({
        message: `Payment is already finalized as '${payment.status}'.`,
      });
    }

    if (outcome === "failed") {
      payment.status = "failed";
      await payment.save();
      return res.json({
        message: "Dummy payment marked as failed.",
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
        },
      });
    }

    const event = await Event.findById(payment.event);
    if (!event) {
      return res.status(404).json({ message: "Linked event not found." });
    }

    const availableTickets = (event.totalTickets || 0) - (event.bookedTickets || 0);
    if (availableTickets < payment.tickets) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({
        message: "Tickets are no longer available. Payment marked as failed.",
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          status: payment.status,
        },
      });
    }

    const newBooking = new Booking({
      event: payment.event,
      user: payment.user,
      tickets: payment.tickets,
      quantity: payment.tickets,
      totalPrice: payment.amount,
      totalAmount: payment.amount,
    });

    await newBooking.save();
    await issueTicketsForBooking({
      bookingId: newBooking._id,
      eventId: payment.event,
      userId: payment.user,
      count: payment.tickets,
    });
    await Event.updateOne(
      { _id: payment.event },
      { $inc: { bookedTickets: payment.tickets } },
    );

    payment.status = "success";
    payment.booking = newBooking._id;
    await payment.save();

    return res.json({
      message: "Dummy payment successful and booking confirmed.",
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
      booking: newBooking,
    });
  } catch (error) {
    console.error("Simulate Payment Error:", error);
    return res
      .status(500)
      .json({ message: "Server error while simulating payment." });
  }
};

const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;

    const payment = await Payment.findById(paymentId)
      .populate("event", "title date location")
      .populate("booking");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    if (payment.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized for this payment." });
    }

    return res.json({
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        tickets: payment.tickets,
        provider: payment.provider,
        event: payment.event,
        booking: payment.booking,
      },
    });
  } catch (error) {
    console.error("Get Payment Status Error:", error);
    return res
      .status(500)
      .json({ message: "Server error while fetching payment status." });
  }
};

module.exports = {
  createPayment,
  simulatePaymentOutcome,
  getPaymentStatus,
};
