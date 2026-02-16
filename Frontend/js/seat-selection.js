import api from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  // Find the "Proceed to Payment" or "Confirm Booking" button
  // Make sure your button in seat-selection.html has this ID
  const proceedButton = document.getElementById("proceed-to-payment-btn");

  if (proceedButton) {
    proceedButton.addEventListener("click", handleDirectBooking);
  } else {
    console.error(
      'Booking button with id="proceed-to-payment-btn" not found on seat selection page.',
    );
  }
});

async function handleDirectBooking() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in to book an event.");
    window.location.href = "login.html";
    return;
  }

  // Get eventId and ticket quantity from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("id");
  const tickets = parseInt(urlParams.get("quantity"), 10);

  if (!eventId || isNaN(tickets) || tickets <= 0) {
    alert("Invalid event details or ticket quantity from URL.");
    return;
  }

  const bookingButton = document.getElementById("proceed-to-payment-btn");
  bookingButton.disabled = true;
  bookingButton.textContent = "Processing...";

  try {
    // Use the simplified api.createBooking function
    const response = await api.createBooking({ eventId, tickets }, token);

    alert(response.message || "Booking successful!");

    // Redirect to the user's account page to see their new booking
    window.location.href = "account.html";
  } catch (error) {
    console.error("Booking Error:", error);
    alert(error.message || "Booking failed. Please try again.");
    bookingButton.disabled = false;
    bookingButton.textContent = "Proceed to Payment";
  }
}
