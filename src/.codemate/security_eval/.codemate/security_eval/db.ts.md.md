# Security Vulnerability Report: `src/db.ts`

---

## 1. Hardcoded Credentials

**Description:**  
The code contains hardcoded database credentials as default values:

```ts
user: process.env.DB_USER || 'postgres',
password: process.env.DB_PASSWORD || 'Siderpsk123$',
database: process.env.DB_NAME || 'unyva_db',
```

**Security Issue:**  
- If environment variables are not set, the app falls back to hardcoded credentials. These may be weak or widely known to attackers.
- Hardcoded secrets may be accidentally committed or disclosed, violating secure secret management practices.

**Recommendation:**  
- Remove all hardcoded secrets.  
- Fail fast if required environment variables are unset; do not default to hardcoded values.
- Use secret management services where available.

---

## 2. Verbose Error Logging

**Description:**  
On database errors, the code logs the full error object:

```ts
pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});
```

**Security Issue:**  
- Logging raw error objects may expose sensitive information (usernames, connection strings, stack traces) if log files are accessed.
- Detailed errors may aid attackers in reconnaissance.

**Recommendation:**  
- Sanitize or truncate error logs in production.  
- Do not log raw errors; only log high-level information.
- Use proper log levels and secure log storage with restricted access.

---

## 3. Privilege Escalation/Exposure Risk

**Description:**  
The connection attempts, user value, and script execution context lack enforced restrictions or privilege scoping.

**Security Issue:**  
- The database user (`postgres`) typically has elevated privileges, which should not be used for application access.
- Lack of least-privilege user design increases risk if the application is compromised.

**Recommendation:**  
- Use a dedicated, minimally-privileged database account for application access.
- Validate that the user specified in the connection string owns only the minimum required permissions.

---

## Security Report Summary Table

| Vulnerability                  | Severity | Recommendation                                    |
| ------------------------------ | -------- | ------------------------------------------------- |
| Hardcoded credentials          | High     | Remove; enforce secrets via env/secret manager     |
| Verbose error logging          | Medium   | Sanitize logs; restrict sensitive error exposure   |
| Privilege escalation/exposure  | Medium   | Use least-privilege database accounts              |

---

## General Recommendations

- **Never commit secrets** to version control.
- Use environment variables and secret managers for credentials.
- Limit database user privileges to the minimum required.
- Audit and secure logging mechanisms.

---

**Immediate Actions:**
- Refactor code to eliminate all hardcoded secrets.
- Adjust error logging for safe and minimal production output.
- Validate and restrict database account privileges.