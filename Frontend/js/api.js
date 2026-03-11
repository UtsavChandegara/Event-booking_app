const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

const api = {
  // Auth endpoints
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      return response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "Registration failed");
      error.data = data;
      throw error;
    }

    return data;
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  },

  resetPassword: async (token, password) => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Reset failed");
    }
    return data;
  },

  requestOrganizerRole: async (token) => {
    const response = await fetch(`${API_URL}/auth/request-organizer-role`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not submit your request.");
    }
    return data;
  },

  // User Profile endpoints
  getUserProfile: async (token) => {
    const response = await fetch(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch profile");
    }
    return response.json();
  },

  updateUserProfile: async (profileData, token) => {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update profile");
    }
    return response.json();
  },

  changePassword: async (passwordData, token) => {
    const response = await fetch(`${API_URL}/users/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to change password");
    }
    return response.json();
  },

  getUserBookings: async (token, status = "") => {
    const query = status ? `?status=${status}` : "";
    const response = await fetch(`${API_URL}/users/bookings${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user bookings");
    }
    return response.json();
  },

  // Event endpoints
  getAllEvents: async () => {
    const response = await fetch(`${API_URL}/events`);
    return response.json();
  },

  getEventById: async (id) => {
    const response = await fetch(`${API_URL}/events/${id}`);
    return response.json();
  },

  createEvent: async (eventData, token) => {
    const response = await fetch(`${API_URL}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: eventData, // eventData is already a FormData object
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create event");
    }

    return await response.json();
  },

  deleteEvent: async (id, token) => {
    const response = await fetch(`${API_URL}/events/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  },

  getEventBookings: async (eventId, token) => {
    const response = await fetch(`${API_URL}/events/${eventId}/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch event bookings");
    }
    return response.json();
  },

  // Booking endpoints
  createBooking: async (bookingData, token) => {
    const response = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Booking failed");
    }

    return response.json();
  },

  cancelBooking: async (bookingId, token) => {
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to cancel booking");
    }
    return response.ok;
  },

  getMyTickets: async (token, bookingId = "") => {
    const query = bookingId ? `?bookingId=${bookingId}` : "";
    const response = await fetch(`${API_URL}/tickets/my${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch tickets");
    }
    return response.json();
  },

  getDynamicQr: async (ticketId, token) => {
    const response = await fetch(`${API_URL}/tickets/${ticketId}/qr`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to generate QR");
    }
    return data;
  },

  verifyTicketScan: async (payload, token) => {
    const response = await fetch(`${API_URL}/tickets/scan/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to verify ticket");
    }
    return data;
  },

  getEntryRecords: async (eventId, token) => {
    const response = await fetch(
      `${API_URL}/tickets/entry-records?eventId=${encodeURIComponent(eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch entry records");
    }
    return data;
  },

  getEligibleCards: async (token, bookingId = "") => {
    const query = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : "";
    const response = await fetch(`${API_URL}/cards/eligible${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch eligible cards");
    }
    return data;
  },

  createExperienceCard: async (payload, token) => {
    const formData = new FormData();
    formData.append("ticketId", payload.ticketId);
    formData.append("mood", payload.mood);
    formData.append("scene", payload.scene);
    if (payload.stylePrompt) {
      formData.append("stylePrompt", payload.stylePrompt);
    }
    if (payload.selfie instanceof File) {
      formData.append("selfie", payload.selfie);
    }

    const response = await fetch(`${API_URL}/cards/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to create experience card");
    }
    return data;
  },

  getMyCards: async (token, bookingId = "") => {
    const query = bookingId ? `?bookingId=${encodeURIComponent(bookingId)}` : "";
    const response = await fetch(`${API_URL}/cards/my${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch your cards");
    }
    return data;
  },

  markCardShared: async (cardId, token) => {
    const response = await fetch(`${API_URL}/cards/${cardId}/share`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to mark card as shared");
    }
    return data;
  },

  markCardDownloaded: async (cardId, token) => {
    const response = await fetch(`${API_URL}/cards/${cardId}/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to mark card as downloaded");
    }
    return data;
  },

  getSharedCard: async (shareToken) => {
    const response = await fetch(
      `${API_URL}/cards/share/${encodeURIComponent(shareToken)}`,
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to load shared card");
    }
    return data;
  },

  markSharedCardDownloaded: async (shareToken) => {
    const response = await fetch(
      `${API_URL}/cards/share/${encodeURIComponent(shareToken)}/download`,
      {
        method: "POST",
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to record shared download");
    }
    return data;
  },

  getExperienceAnalytics: async (eventId, token) => {
    const response = await fetch(
      `${API_URL}/cards/analytics/event/${encodeURIComponent(eventId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch experience analytics");
    }
    return data;
  },
};

export default api;
