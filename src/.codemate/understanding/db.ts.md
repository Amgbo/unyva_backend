**High-Level Documentation: Database Connection Setup**

This module establishes a connection pool to a PostgreSQL database using the `pg` library. It uses environment variables (via `dotenv`) to configure database parameters such as host, port, user, password, and database name, providing sensible defaults in case environment variables are not set.

**Key functions:**
- Loads environment variables from a `.env` file.
- Creates a database connection pool with configurable connection parameters.
- Exports the pool instance for database interactions in other parts of the application.
- Sets up listeners for:
  - Successful connection (logs confirmation).
  - Connection errors (logs error details).

**Purpose:**  
Facilitates reusable and centralized access to the PostgreSQL database throughout the application, with basic monitoring for connection status and errors.