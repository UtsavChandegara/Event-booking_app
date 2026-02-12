const schedule = require("node-schedule");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const emailService = require("./emailService");

/**
 * This job runs periodically (e.g., every hour) to send event reminders.
 */
const startReminderScheduler = () => {
  // Run the job every hour at the beginning of the hour
  schedule.scheduleJob("0 * * * *", async () => {
    console.log("Running scheduled job: Checking for event reminders...");

    const now = new Date();
    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    );
    const twentyFiveHoursFromNow = new Date(
      now.getTime() + 25 * 60 * 60 * 1000,
    ); // To create a 1-hour window

    try {
      // Find events that are starting between 24 and 25 hours from now
      const upcomingEvents = await Event.find({
        date: { $gte: twentyFourHoursFromNow, $lt: twentyFiveHoursFromNow },
      });

      if (upcomingEvents.length === 0) {
        console.log("No upcoming events to send reminders for in this cycle.");
        return;
      }

      for (const event of upcomingEvents) {
        const bookings = await Booking.find({ event: event._id }).populate(
          "user",
        );
        for (const booking of bookings) {
          emailService
            .sendBookingReminder(booking.user, event)
            .catch((err) =>
              console.error(
                `Failed to send reminder to ${booking.user.email}:`,
                err,
              ),
            );
        }
      }
    } catch (error) {
      console.error("Error in reminder scheduler:", error);
    }
  });
};

module.exports = { startReminderScheduler };
