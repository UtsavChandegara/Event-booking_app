import api from "./api.js";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const feedback = () => window.appFeedback;

const ensureRazorpayLoaded = async () => {
  if (window.Razorpay) {
    return true;
  }

  await feedback().alert(
    "Razorpay checkout failed to load. Refresh the page and try again.",
    {
      type: "error",
      title: "Checkout Unavailable",
    },
  );
  return false;
};

document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");

  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("eventId") || urlParams.get("id");
  const quantity = parseInt(urlParams.get("quantity"), 10) || 1;

  const seatCountEl = document.getElementById("seat-count");
  const totalPriceEl = document.getElementById("total-price");
  const checkoutBtn = document.getElementById("checkout-btn");
  const eventTitleHeading = document.getElementById("event-title-heading");
  const eventSubtitle = document.getElementById("event-subtitle");

  if (!checkoutBtn || !eventTitleHeading || !eventSubtitle) {
    return;
  }

  if (!eventId) {
    eventSubtitle.innerHTML =
      '<p style="color: red; text-align: center;">No Event ID provided.</p>';
    checkoutBtn.disabled = true;
    return;
  }

  if (currentUser && (currentUser.role === "organizer" || currentUser.role === "admin")) {
    eventTitleHeading.textContent = "Booking Disabled";
    eventSubtitle.innerHTML =
      '<p style="color: #dc2626; text-align: center;">Organizer/Admin accounts cannot book tickets.</p>';
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Not Allowed";
    return;
  }

  let ticketPrice = 0;
  let eventTitle = "";
  let availableTickets = 0;

  const setCheckoutState = (isBusy, label = "Proceed to Payment") => {
    checkoutBtn.disabled = isBusy;
    checkoutBtn.textContent = isBusy ? label : "Proceed to Payment";
  };

  try {
    const event = await api.getEventById(eventId);
    if (!event || event.message) {
      throw new Error(event?.message || "Failed to fetch event details");
    }

    ticketPrice = Number(event.price) || 0;
    eventTitle = event.title || "Event";
    availableTickets = (event.totalTickets || 0) - (event.bookedTickets || 0);

    eventTitleHeading.textContent = `Confirm Booking for ${eventTitle}`;
    eventSubtitle.innerHTML = `You are booking <strong>${quantity}</strong> ticket(s).<br><span style="font-size: 0.9rem;">${availableTickets} seats remaining.</span>`;

    seatCountEl.textContent = quantity;
    totalPriceEl.textContent = formatCurrency(quantity * ticketPrice);

    if (availableTickets < quantity) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Not Enough Tickets";
      eventSubtitle.innerHTML +=
        '<br><strong style="color: red;">There are not enough tickets available for this quantity.</strong>';
    }
  } catch (error) {
    console.error("Seat selection load error:", error);
    eventSubtitle.textContent = error.message || "Could not load event details.";
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.addEventListener("click", async () => {
    if (!token) {
      await feedback().alert("Please log in to proceed with the booking.", {
        type: "error",
        title: "Login Required",
      });
      window.location.href = "login.html";
      return;
    }

    if (!(await ensureRazorpayLoaded())) {
      return;
    }

    try {
      setCheckoutState(true, "Starting payment...");

      const orderData = await api.createPaymentOrder(
        { eventId, tickets: quantity },
        token,
      );

      const options = {
        key: orderData.checkout.keyId,
        amount: orderData.checkout.amount,
        currency: orderData.checkout.currency,
        name: "Eventify",
        description: orderData.checkout.description,
        order_id: orderData.checkout.orderId,
        handler: async (response) => {
          try {
            setCheckoutState(true, "Verifying payment...");

            const verifyResult = await api.verifyPayment(
              {
                paymentRecordId: orderData.payment.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              token,
            );

            await feedback().alert(
              verifyResult.message || "Your payment was successful.",
              {
                type: "success",
                title: "Payment Successful",
                confirmLabel: "View Ticket",
              },
            );
            if (verifyResult.booking?._id) {
              window.location.href = `ticket.html?bookingId=${encodeURIComponent(verifyResult.booking._id)}`;
              return;
            }

            window.location.href = "ticket.html";
          } catch (error) {
            console.error("Payment verification error:", error);
            await feedback().alert(
              error.message || "Payment verification failed.",
              {
                type: "error",
                title: "Verification Failed",
              },
            );
            setCheckoutState(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutState(false);
          },
        },
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: currentUser?.phone || "",
        },
        notes: {
          eventId,
          eventTitle,
          tickets: String(quantity),
        },
        theme: {
          color: "#11b3a3",
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", async (response) => {
        console.error("Razorpay payment failed:", response.error);
        await feedback().alert(
          response.error?.description || "Payment failed. Please try again.",
          {
            type: "error",
            title: "Payment Failed",
          },
        );
        setCheckoutState(false);
      });
      razorpayInstance.open();
    } catch (error) {
      console.error("Checkout error:", error);
      await feedback().alert(error.message || "Could not start payment.", {
        type: "error",
        title: "Checkout Error",
      });
      setCheckoutState(false);
    }
  });
});
