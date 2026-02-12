# Eventify - Event Booking Application

Eventify is a full-stack web application that allows users to browse, create, and book events. It features a user-friendly interface for event management and a robust backend to handle user authentication, event data, and bookings.

## Features

*   **User Authentication:** Secure user registration and login system using JWT for authentication.
*   **Event Management:**
    *   Browse and view a list of available events.
    *   Create new events with details like title, description, date, location, and an image upload feature.
    *   View detailed information for a single event.
*   **Event Booking:**
    *   Users can book tickets for their desired events.
    *   View a dashboard of all booked events.
*   **Admin Capabilities:** (Assumed based on `Admin.js` model) Admins have privileges to manage all events and users.

## Tech Stack

*   **Frontend:** HTML, CSS, JavaScript
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB with Mongoose
*   **Libraries:**
    *   `bcryptjs` for password hashing
    *   `jsonwebtoken` (JWT) for authentication
    *   `multer` for handling file uploads
    *   `cors` for enabling cross-origin requests

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have the following software installed on your system:

*   [Node.js](https://nodejs.org/) (which includes npm)
*   [MongoDB](https://www.mongodb.com/try/download/community) (or a MongoDB Atlas cloud account)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Event-booking_app.git
    cd Event-booking_app
    ```

2.  **Install Backend Dependencies:**
    Navigate to the `Backend` directory and install the required npm packages.
    ```bash
    cd Backend
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file inside the `Backend` directory and add the following variables. Replace the placeholder values with your actual data.
    ```
    PORT=3000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    ADMIN_SECRET=your_admin_secret_key
    ```

## Running the Application

1.  **Start the Backend Server:**
    From the `Backend` directory, run the following command to start the server with `nodemon`, which will automatically restart on file changes.
    ```bash
    npm run dev
    ```
    The server will start on the port you specified in your `.env` file (e.g., `http://localhost:3000`).

2.  **Launch the Frontend:**
    Open the `Frontend` directory and simply open the `index.html` file in your web browser.

    You can also serve the `Frontend` directory using a live server extension in your code editor to handle automatic reloads.

## API Endpoints

The backend exposes the following REST API endpoints:

*   **Auth Routes (`/api/auth`)**
    *   `POST /register`: Register a new user.
    *   `POST /login`: Log in a user.

*   **Event Routes (`/api/events`)**
    *   `GET /`: Get all events.
    *   `GET /:id`: Get a single event by its ID.
    *   `POST /`: Create a new event (protected).
    *   `PUT /:id`: Update an event (protected).
    *   `DELETE /:id`: Delete an event (protected).

*   **Booking Routes (`/api/bookings`)**
    *   `GET /`: Get all bookings for the logged-in user (protected).
    *   `POST /`: Create a new booking for an event (protected).
