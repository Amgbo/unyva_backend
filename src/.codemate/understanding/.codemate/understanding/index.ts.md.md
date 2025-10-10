# High-Level Documentation: `src/index.ts`

## Purpose

The file serves as the main entry point for a Node.js backend API built with Express.js and PostgreSQL, written in TypeScript with ES Module syntax. Its responsibilities include initializing the server, configuring middleware, connecting to the database, setting up routes, and managing static file serving.

---

## Main Functional Components

### 1. **Environment Configuration and Imports**
   - Loads environment variables (e.g., from `.env`) for run-time configuration (such as database credentials, server port/host).
   - Imports essential modules:
     - Express (for web server functionality).
     - CORS (for handling cross-origin requests).
     - Path (for filesystem operations).
     - Utility for resolving `__dirname` (to locate static resources).
     - Database pool for PostgreSQL connections.
     - Route handlers (from external files).

### 2. **Express Server Setup**
   - Instantiates the Express application.
   - Resolves server host and port, falling back to defaults if not specified.

### 3. **Middleware Configuration**
   - Enables CORS for all routes.
   - Sets up parsers for JSON and URL-encoded request bodies.
   - Configures serving of static files from an `uploads` directory.

### 4. **API Routing**
   - **Root route (`/`)**: Health check endpoint to verify that the server is running.
   - **Test route (`/api/test`)**: Basic endpoint for backend operational sanity.
   - **Feature routes**: Delegates `/api/students` and `/api/home` requests to dedicated route handler modules.

### 5. **Server Startup Logic**
   - Starts the server, listening on the given port and host.
   - Logs the server URLs and endpoints on startup for developer convenience.

### 6. **Database Connection Check**
   - Immediately after start-up, runs a simple query against the PostgreSQL pool to ensure database connectivity.
   - Logs successful connection timestamp or an error if the connection fails.

---

## Extensibility & Design Considerations

- **Environment-Driven**: Behavior can be adapted via environment variables for different deployment targets (development, production, testing).
- **Modular Architecture**: Routing and database logic are decoupled for maintainability and scalability; new features and middlewares can be added easily.
- **Static Assets Support**: Allows serving files (e.g., uploads) directly via HTTP.
- **Modern Syntax**: Written with ES Module imports/exports for forward compatibility and improved tooling.

---

## Summary

`src/index.ts` orchestrates the bootstrapping of a TypeScript-based Express.js REST API with PostgreSQL integration. It lays out foundational server configuration, routing, middleware, and connectivity checks, forming the core of the backend application's runtime environment.