# Eventify - Event Booking Application

Eventify is a full-stack web application that allows users to browse, create, and book events. It features a user-friendly interface for event management and a robust backend to handle user authentication, event data, and bookings.

## ✨ Features

- **User Authentication:** Secure user registration and login system using JWT for authentication.
- **Event Management:**
  - Browse and view a list of available events.
  - Create new events with details like title, description, date, location, and an image upload feature.
  - View detailed information for a single event.
- **Event Booking:**
  - Users can book tickets for their desired events.
  - View a dashboard of all booked events.
- **Admin Capabilities:** Admins have privileges to manage all events and users.

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** `bcryptjs` for password hashing, `jsonwebtoken` (JWT) for token-based auth.
- **File Uploads:** `multer` for handling `multipart/form-data`.
- **Middleware:** `cors` for enabling Cross-Origin Resource Sharing.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have the following software installed on your system:

- Node.js (v14 or newer)
- npm (comes with Node.js)
- MongoDB (or a MongoDB Atlas cloud account)

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/Event-booking_app.git
    cd Event-booking_app
    ```

2.  **Install Backend Dependencies:**
    Navigate to the `Backend` directory and install the required `npm` packages.

    ```bash
    cd Backend
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the `Backend` directory and add the following variables, replacing the placeholder values with your actual data.
    ```env
    PORT=3000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_super_secret_jwt_key
    ADMIN_SECRET=your_admin_secret_key
    ```

## 🏃 Running the Application

1.  **Start the Backend Server:**
    From the `Backend` directory, run the development server. It uses `nodemon` to automatically restart on file changes.

    ```bash
    npm run dev
    ```

    The server will start on the port you specified in your `.env` file (e.g., `http://localhost:3000`).

2.  **Launch the Frontend:**
    Navigate to the `Frontend` directory and open the `index.html` file in your web browser.

    For a better development experience with live-reloading, you can use a tool like the Live Server extension for VS Code.

## 📝 API Endpoints

The backend exposes the following REST API endpoints:

| Method   | Endpoint             | Description                        | Protected |
| :------- | :------------------- | :--------------------------------- | :-------- |
| `POST`   | `/api/auth/register` | Register a new user.               | No        |
| `POST`   | `/api/auth/login`    | Log in a user and get a token.     | No        |
| `GET`    | `/api/events`        | Get all events.                    | No        |
| `GET`    | `/api/events/:id`    | Get a single event by its ID.      | No        |
| `POST`   | `/api/events`        | Create a new event.                | Yes       |
| `PUT`    | `/api/events/:id`    | Update an event.                   | Yes       |
| `DELETE` | `/api/events/:id`    | Delete an event.                   | Yes       |
| `GET`    | `/api/bookings`      | Get all bookings for the user.     | Yes       |
| `POST`   | `/api/bookings`      | Create a new booking for an event. | Yes       |
