const nodemailer = require("nodemailer");
require("dotenv").config();

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail", // Or any other email service
  auth: {
    user: process.env.EMAIL_USER, // Your email from .env
    pass: process.env.EMAIL_PASSWORD, // Your password or app password from .env
  },
});

/**
 * Sends a booking confirmation email to the user.
 * @param {object} user - The user object (must have email and name).
 * @param {object} booking - The booking object.
 * @param {object} event - The event object.
 */
const sendBookingConfirmation = async (user, booking, event) => {
  const mailOptions = {
    from: `"Eventify" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Booking Confirmation for ${event.title}`,
    html: `
            <h1>Booking Confirmed!</h1>
            <p>Hi ${user.name},</p>
            <p>Thank you for your booking. Here are your details:</p>
            <ul>
                <li><strong>Event:</strong> ${event.title}</li>
                <li><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</li>
                <li><strong>Location:</strong> ${event.location}</li>
                <li><strong>Tickets Booked:</strong> ${booking.tickets}</li>
                <li><strong>Total Price:</strong> ₹${booking.totalPrice}</li>
                <li><strong>Booking ID:</strong> ${booking._id}</li>
            </ul>
            <p>You can view your booking details in your dashboard.</p>
            <p>Thanks,<br>The Eventify Team</p>
        `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sends a notification to the event organizer about a new booking.
 * @param {object} organizer - The organizer user object.
 * @param {object} customer - The user who made the booking.
 * @param {object} event - The event that was booked.
 * @param {object} booking - The booking object.
 */
const sendNewBookingNotificationToOrganizer = async (
  organizer,
  customer,
  event,
  booking,
) => {
  const mailOptions = {
    from: `"Eventify" <${process.env.EMAIL_USER}>`,
    to: organizer.email,
    subject: `New Booking for Your Event: ${event.title}`,
    html: `
            <h1>New Booking!</h1>
            <p>Hi ${organizer.name},</p>
            <p>A new booking has been made for your event "${event.title}".</p>
            <ul>
                <li><strong>Customer Name:</strong> ${customer.name}</li>
                <li><strong>Customer Email:</strong> ${customer.email}</li>
                <li><strong>Tickets Booked:</strong> ${booking.tickets}</li>
            </ul>
            <p>You can view all bookings for this event in your dashboard.</p>
        `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sends a password reset email.
 * @param {object} user - The user requesting the reset.
 * @param {string} resetToken - The password reset token.
 */
const sendPasswordReset = async (user, resetToken) => {
  // IMPORTANT: Replace 'http://yourapp.com' with your actual frontend URL
  const resetUrl = `http://127.0.0.1:5500/Frontend/reset-password.html?token=${resetToken}`;

  const mailOptions = {
    from: `"Eventify" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Password Reset Request",
    html: `
            <h1>Password Reset</h1>
            <p>Hi ${user.name},</p>
            <p>You requested a password reset. Click the link below to create a new password. This link will expire in 1 hour.</p>
            <a href="${resetUrl}" style="background-color: #667eea; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
        `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sends an event cancellation notification.
 * @param {object} user - The user who had a booking.
 * @param {object} event - The cancelled event.
 */
const sendEventCancellation = async (user, event) => {
  const mailOptions = {
    from: `"Eventify" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Event Canceled: ${event.title}`,
    html: `
            <h1>Event Cancellation Notice</h1>
            <p>Hi ${user.name},</p>
            <p>We regret to inform you that the event "<strong>${event.title}</strong>" scheduled for ${new Date(event.date).toLocaleString()} has been canceled.</p>
            <p>A full refund for your booking will be processed within 5-7 business days.</p>
            <p>We apologize for any inconvenience this may cause.</p>
            <p>Sincerely,<br>The Eventify Team</p>
        `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Sends a reminder email for an upcoming event.
 * @param {object} user - The user to remind.
 * @param {object} event - The upcoming event.
 */
const sendBookingReminder = async (user, event) => {
  const mailOptions = {
    from: `"Eventify" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Reminder: Your Event "${event.title}" is Tomorrow!`,
    html: `
            <h1>Event Reminder</h1>
            <p>Hi ${user.name},</p>
            <p>This is a friendly reminder that your event, "<strong>${event.title}</strong>", is happening soon!</p>
            <ul>
                <li><strong>Date & Time:</strong> ${new Date(event.date).toLocaleString()}</li>
                <li><strong>Location:</strong> ${event.location}</li>
            </ul>
            <p>We look forward to seeing you there!</p>
        `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendBookingConfirmation,
  sendNewBookingNotificationToOrganizer,
  sendPasswordReset,
  sendEventCancellation,
  sendBookingReminder,
};
