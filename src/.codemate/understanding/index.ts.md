# High-Level Documentation for `src/index.ts`

This file initializes and launches the backend server for the application, providing the following key functionalities:

## Overview
- Sets up an Express-based web server.
- Loads environment variables for configuration.
- Connects to a PostgreSQL database.
- Configures middleware for request handling, static file serving, and CORS.
- Loads API routes for students and home endpoints.
- Provides basic health check endpoints.
- Verifies database connectivity on startup.

## Major Components

### Environment Setup
- Loads environment variables using `dotenv` to configure server port, host, and other sensitive settings.

### Middleware Configuration
- **CORS**: Enables requests from different origins.
- **Body Parsing**: Processes incoming JSON and URL-encoded data.
- **Static File Serving**: Serves files from the `/uploads` directory.

### Database Connection
- Imports a connection pool to PostgreSQL.
- Checks database connectivity at server startup, logging success or failure.

### Routing
- **Root endpoint** (`/`): Returns a basic message for sanity check.
- **Test endpoint** (`/api/test`): Confirms backend is operational.
- **API routes**:
  - `/api/students`: Handles student-related operations.
  - `/api/home`: Handles home page-related features.

### Server Initialization
- Starts the server on the configured host and port.
- Logs accessible URLs for easy access.

## Error Handling & Diagnostics
- On startup, attempts to query the database and logs the connection status.
- Catches and logs any database connection errors.

---

**Summary:**  
This entry point sets up the foundational backend services, ensuring environment readiness, connectivity, routing, and developer diagnostics for the Unyva application. All subsequent API logic is delegated to route modules.