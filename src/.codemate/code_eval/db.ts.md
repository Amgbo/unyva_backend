# Code Review Report: `src/db.ts`

---

## Summary

The provided code is responsible for initializing a PostgreSQL connection using the `pg` library, loading environment variables using `dotenv`, and setting up event listeners for connection and error events. A critical review of the implementation reveals some best practice violations, security concerns, and potential unoptimized approaches, as outlined below.

---

## Detailed Review

### 1. **Hardcoded Sensitive Data**

**Issue:**  
The `password` and `user` fields have default values, exposing sensitive information in the codebase.

```js
password: process.env.DB_PASSWORD || 'Siderpsk123$',
user: process.env.DB_USER || 'postgres',
database: process.env.DB_NAME || 'unyva_db',
```

**Recommendation:**  
Do **not** provide hardcoded sensitive defaults. Instead, throw an error if required environment variables are missing. This mitigates accidental credential exposure and enforces secure deployment configuration.

**Suggested Correction:**
```pseudo
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error('Database credentials are not set in environment variables.');
}
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
```

---

### 2. **Unconditional Default Host and Port**

**Issue:**  
While providing a fallback for `host` and `port` may ease local development, it could cause ambiguity in non-development environments.

**Recommendation:**  
Explicitly log which configuration is being used, or, in stricter production setups, require all values from the environment.

**Suggested Correction:**
```pseudo
host: process.env.DB_HOST || 'localhost', // (add a log message if default is used)
port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432, // clarify conversion
```

Or for stricter configuration:
```pseudo
if (!process.env.DB_HOST || !process.env.DB_PORT) {
  throw new Error('Database host and port must be set in environment variables.');
}
host: process.env.DB_HOST,
port: Number(process.env.DB_PORT),
```

---

### 3. **dotenv Loading Location**

**Issue:**  
`dotenv.config()` should ideally be called at the app’s entry point, not inside utility modules. This ensures environment variables are present for all imported files.

**Recommendation:**  
Remove `dotenv.config()` from this file and document the required environment setup in your project’s README.

**Suggested Correction:**
```pseudo
// Remove: dotenv.config();
```

---

### 4. **Error Logging**

**Issue:**  
Logging errors with potentially sensitive details could leak information into logs, especially if logs are not properly secured.

**Recommendation:**  
Log only necessary information and ensure stack traces or sensitive data are not exposed.

**Suggested Correction:**
```pseudo
pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err.message);
});
```

---

### 5. **Resource Cleanup**

**Issue:**  
There is no handling for application shutdown to properly close the connection pool and free resources.

**Recommendation:**  
Add process signal handlers to gracefully shut down the pool.

**Suggested Correction:**
```pseudo
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

---

### 6. **Other Best Practices**

- Use `.env.example` and avoid committing real credentials or use secret managers in CI/CD pipelines.
- Consider enabling SSL in production environments.

---

## Summary Table

| Issue                                  | Severity | Recommendation                                |
|-----------------------------------------|----------|-----------------------------------------------|
| Hardcoded credentials                   | High     | Require env vars, throw if missing            |
| Fallback to default host/port           | Medium   | Require explicit config or log default usage  |
| `dotenv.config()` location              | Medium   | Move to entry point                           |
| Error logging detail                    | Low      | Limit log details on error                    |
| Resource cleanup                        | Low      | Handle process signals for cleanup            |

---

## Example Corrections (Pseudo Code)

```pseudo
// 1. Require env vars for credentials
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error('DB config missing in environment');
}
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,

// 2. Remove dotenv.config()
/* (Handled in entry point, not here) */

// 3. Limit error logging
pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err.message);
});

// 4. Resource cleanup signals
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

---

## Conclusion

The provided code works but violates important security and deployment best practices. Immediate action—especially regarding secret management—is required to ensure the codebase is production-safe and aligned with industry standards.