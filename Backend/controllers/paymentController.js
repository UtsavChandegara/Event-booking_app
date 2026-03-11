const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const { issueTicketsForBooking } = require("../services/ticketService");

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const createBookingFromPayment = async (payment) => {
  const event = await Event.findById(payment.event);
  if (!event) {
    throw new Error("Linked event not found.");
  }

  const availableTickets = (event.totalTickets || 0) - (event.bookedTickets || 0);
  if (availableTickets < payment.tickets) {
    throw new Error("Tickets are no longer available.");
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

  return newBooking;
};

const createPayment = async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({
        message:
          "Razorpay is not configured on the server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

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
    const amountInPaise = Math.round(amount * 100);
    const receipt = `rcpt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const currency = process.env.RAZORPAY_CURRENCY || "INR";

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        eventId: String(event._id),
        userId: String(userId),
        tickets: String(tickets),
      },
    });

    const payment = await Payment.create({
      paymentId: order.id,
      orderId: order.id,
      receipt,
      user: userId,
      event: eventId,
      tickets,
      amount,
      currency,
      status: "pending",
      provider: "razorpay",
    });

    return res.status(201).json({
      message: "Razorpay order created successfully.",
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        eventId,
        tickets,
      },
      checkout: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: event.title,
        description: `${tickets} ticket(s) for ${event.title}`,
      },
    });
  } catch (error) {
    console.error("Create Payment Error:", error);
    return res.status(500).json({
      message:
        error?.error?.description ||
        error?.description ||
        error?.message ||
        "Server error while creating payment.",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({
        message:
          "Razorpay is not configured on the server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    const {
      paymentRecordId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== "user") {
      return res.status(403).json({
        message: "Only attendee accounts can book tickets.",
      });
    }

    if (
      !paymentRecordId ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      return res.status(400).json({
        message:
          "paymentRecordId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
      });
    }

    const payment = await Payment.findById(paymentRecordId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    if (payment.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized for this payment." });
    }

    if (payment.status === "success" && payment.booking) {
      const existingBooking = await Booking.findById(payment.booking);
      return res.json({
        message: "Payment already verified.",
        payment: {
          id: payment._id,
          paymentId: payment.paymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
        },
        booking: existingBooking,
      });
    }

    if (payment.orderId !== razorpayOrderId) {
      return res.status(400).json({ message: "Order mismatch." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      payment.status = "failed";
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      await payment.save();

      return res.status(400).json({ message: "Invalid Razorpay signature." });
    }

    const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);
    if (!razorpayPayment || razorpayPayment.order_id !== payment.orderId) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: "Payment verification failed." });
    }

    const expectedAmountInPaise = Math.round(payment.amount * 100);
    if (
      Number(razorpayPayment.amount) !== expectedAmountInPaise ||
      razorpayPayment.currency !== payment.currency
    ) {
      payment.status = "failed";
      await payment.save();
      return res.status(400).json({ message: "Payment amount mismatch." });
    }

    let booking = payment.booking ? await Booking.findById(payment.booking) : null;
    if (!booking) {
      booking = await createBookingFromPayment(payment);
    }

    payment.status = "success";
    payment.booking = booking._id;
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    await payment.save();

    return res.json({
      message: "Payment verified and booking confirmed.",
      payment: {
        id: payment._id,
        paymentId: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      },
      booking,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({
      message:
        error?.error?.description ||
        error?.description ||
        error?.message ||
        "Server error while verifying payment.",
    });
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
  verifyPayment,
  getPaymentStatus,
};
