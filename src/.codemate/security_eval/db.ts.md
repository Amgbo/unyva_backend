# Security Vulnerability Report: src/db.ts

This report analyzes security vulnerabilities within the provided code focused on database connection in Node.js using the `pg` package.

---

## 1. **Hardcoded Credentials**

- **Description**: The code provides a fallback to hardcoded database credentials if environment variables are not set. For example:
    ```js
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Siderpsk123$',
    database: process.env.DB_NAME || 'unyva_db',
    ```
- **Impact**: Hardcoded credentials can be leaked through source code repositories, increasing the risk of unauthorized database access.
- **Recommendation**: Remove all hardcoded credentials. Ensure the application fails securely if environment variables are missing. Consider using secrets management services.

---

## 2. **Environment Variable Exposure**

- **Description**: While `.env` is used to load configuration, if misconfigured, secrets could be accidentally committed to version control.
- **Impact**: Database credentials and other secrets may be exposed.
- **Recommendation**: Add `.env` to `.gitignore`. Regularly audit repository for any accidental leaks.

---

## 3. **Missing SSL Configuration for Database Connection**

- **Description**: There is no SSL/TLS configuration in the database pool connection.
- **Impact**: Data transmitted between the application and the database may be susceptible to man-in-the-middle attacks, especially in cloud or production environments.
- **Recommendation**: Explicitly set `ssl: true` or add proper SSL settings when connecting to remote databases.

---

## 4. **Verbose Logging of Connection Events**

- **Description**: Console logs for connection and error events:
    ```js
    pool.on('error', (err) => {
      console.error('❌ PostgreSQL connection error:', err);
    });
    ```
- **Impact**: Logging full error objects may inadvertently leak sensitive information (such as database connection details or stack traces) to logs accessible to attackers.
- **Recommendation**: Sanitize and minimize error information in logs. Never log database credentials or sensitive details.

---

## 5. **No Limitation on Connection Pool Size**

- **Description**: The pool is created without specifying pool size or limits.
- **Impact**: Unrestricted pool size may allow resource exhaustion attacks (e.g., DoS).
- **Recommendation**: Define reasonable defaults for `max`, `idleTimeoutMillis`, and other relevant pool options.

---

## 6. **Potential for Default Localhost / Default User Exposure**

- **Description**: Use of default values `"localhost"` and `"postgres"` as fallback in production code is risky.
- **Impact**: Attackers may guess these settings and attempt to brute-force passwords, especially if other controls are lacking.
- **Recommendation**: Require explicit secure configuration in production environments.

---

## Summary Table

| Vulnerability                      | Impact                              | Recommendation                                 |
|-------------------------------------|-------------------------------------|------------------------------------------------|
| Hardcoded Credentials               | Unauthorized access                 | Remove hardcoding, use secure secrets management|
| Env File Exposure                   | Credential leaks                    | `.env` in `.gitignore`, audit for leaks        |
| Missing SSL                         | Man-in-the-middle attacks           | Add SSL configuration                          |
| Verbose Logging                     | Sensitive info in logs              | Sanitize logs                                  |
| Unlimited Pool Size                 | Resource exhaustion                 | Set size limits                                |
| Default Host/User                   | Weak secret hygiene                 | Require explicit configuration                 |

---

## Remediation Checklist

- [ ] Remove all hardcoded credentials and fail securely if environment variables are missing.
- [ ] Add `.env` to `.gitignore` and monitor source code for leaks.
- [ ] Add SSL settings for database connections.
- [ ] Sanitize error logging to avoid leaking sensitive info.
- [ ] Restrict pool size and related options.
- [ ] Avoid use of weak/default values in production.

---

**Note:** None of these items address SQL Injection directly since the provided code does not contain query execution. However, general best practices for query handling are recommended elsewhere.