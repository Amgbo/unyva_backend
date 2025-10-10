High-Level Documentation

File: src/db.ts

**Purpose:**  
Provides a centralized, reusable mechanism for connecting to a PostgreSQL database using connection pooling, ensuring efficient and secure database operations across the application.

**Key Components:**

- **PostgreSQL Integration:**  
  Utilizes the `pg` Node.js client to manage connections and queries with the PostgreSQL database.

- **Environment Configuration:**  
  Uses the `dotenv` library to load database credentials and configurations from environment variables, promoting security and configurability.

- **Connection Pooling:**  
  Sets up a singleton connection pool, leveraging environment-driven configuration (host, port, user, password, database) to optimize resource usage and performance.

- **Logging & Error Handling:**  
  Listens for pool connection and error events; logs successful database connections and reports errors, providing transparency and easier troubleshooting.

**How to Use:**  
- Import the exported `pool` in application modules that require database access.  
- Perform queries using `pool.query(...)` to interface with the PostgreSQL backend.

**Security Considerations:**  
- Ensures sensitive connection details remain outside the codebase, sourced securely from environment variables.

**Summary:**  
This module encapsulates the setup and management of the PostgreSQL connection pool, promoting clean separation of concerns, secure configuration, and consistent database access patterns throughout the codebase.