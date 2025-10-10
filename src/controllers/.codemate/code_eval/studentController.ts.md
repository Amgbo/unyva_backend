# Code Review Report

This report reviews the submitted code for **industry standards**, **unoptimized implementations**, and **coding errors**. Issues are annotated with suggestions, with **proposed pseudo code patches** for correction.

---

## General Industry Standards

### 1. **Environment Variables Access**

- **Issue:** Accessing `process.env.VAR` many times inside code blocks.
- **Suggestion:** Cache env variables at the top of the file for performance/readability.

**Pseudo code:**
```typescript
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const BASE_URL = process.env.BASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
// Use these variables instead of process.env.X inside the code.
```

---

### 2. **Sensitive Data in Logs**

- **Issue:** Logging sensitive variables such as password, tokens, secrets.
- **Recommendation:** Avoid logging such data, especially in production.

**Pseudo code:**
```typescript
// Remove or redact logs such as:
console.log('🔐 Login attempt for student_id:', student_id);
// Remove console logs entirely or use a centralized logging library with log levels.
```

---

### 3. **Error Handling Consistency**

- **Issue:** Sometimes internal errors are generic, sometimes specific.
- **Suggestion:** Use consistent error messaging. Consider logging stack traces separately from client responses.

**Pseudo code:**
```typescript
// When catching errors:
console.error('Error:', err.stack); // for debugging/log file only
res.status(500).json({ error: 'An internal server error occurred.' }); // Standardize client error message
```

---

### 4. **SQL Queries and Potential SQL Injection**

- **Best Practice:** Use **parameterized queries** (as currently implemented).

---

### 5. **Hardcoded Default Secret**

- **Issue:** `"your-super-secret-jwt-key-change-this-in-production"` in code is risky.
- **Suggestion:** **Fail** if `JWT_SECRET` is not set in production.

**Pseudo code:**
```typescript
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production!");
}
```

---

### 6. **Type Safety**

- **Issue:** Type assertions on `req.files` and `req.user` can be risky.
- **Suggestion:** Validate presence and types, use interface instead of `any`.

**Pseudo code:**
```typescript
// For req.user
interface AuthenticatedRequest extends Request {
  user?: {
    student_id: string;
    // ... other fields
  }
}

// In handler
const studentIdFromToken = (req as AuthenticatedRequest).user?.student_id;
```

---

## Individual Function Critique

---

### **registerStep1**

#### **Issues:**

- **No transaction for insert + send email:** Risk if the email fails after DB insert; the student record is still created.
- **No password hash at creation:** If a student never completes step 2, record is incomplete.

#### **Suggestions:**

**Use transaction:**
```typescript
await pool.query('BEGIN');
// Do insert
// Send email
await pool.query('COMMIT');
// If error, use ROLLBACK
```

**Store password as NULL (defer hash until step 2) or re-validate registration on step 2.**

---

### **registerStep2**

#### **Issues:**

- **Storing file paths without validation/sanitization:** Ideally, validate filenames.
- **No check if student is already registered with password (step can be repeated).**
- **Password hash rounds (`bcrypt.hash(password, 10)`):** Use a config value for security flexibility.

#### **Suggestions:**

**Pseudo code:**
```typescript
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Before updating, check if password already set
const existingStudent = await pool.query('SELECT password FROM students WHERE student_id = $1', [student_id]);
if (existingStudent.rows[0].password) {
  res.status(400).json({ error: 'Password already set for this student.' });
  return;
}

// Validate file paths to prevent directory traversal
const profilePicFilename = sanitize(profilePicFile.filename); // sanitize is a custom function
```

---

### **verifyEmail**

#### **Issues:**

- **No token expiry:** Verification tokens should expire after a period.

#### **Suggestion:**
Add a `verification_token_expiry` column, set on creation, check on verification.

**Pseudo code:**
```typescript
const now = new Date();
const result = await pool.query(
  `UPDATE students 
   SET is_verified = TRUE, verification_token = NULL
   WHERE verification_token = $1 
     AND verification_token_expiry > $2
   RETURNING *`, [token, now]);
```

Set expiry in step 1:
```typescript
const expiry = new Date(Date.now() + 24*60*60*1000);
...
INSERT INTO students (..., verification_token, verification_token_expiry, ...)
VALUES (..., verificationToken, expiry, ...)
```

---

### **loginStudent**

#### **Issues:**

- **Email verification check is commented out.** Should be **enforced**.
- **JWT secret fallback is risky.**
- **Returning full student object (risk of leaking sensitive info).**

#### **Recommendations:**

**Pseudo code:**
```typescript
if (!student.is_verified) {
  res.status(403).json({ error: 'Please verify your email before logging in.' });
  return;
}

// When sending student info in response:
const { password, verification_token, ...publicStudent } = student;
res.status(200).json({ message: 'Login successful', token, student: publicStudent });
```

---

### **getStudentProfile / getStudentProfileById**

#### **Issues:**

- **Directly exposing student records with all data.**
- **No sanitization/validation of studentId in req.params.**

#### **Suggestion:**
Return only public profile fields, not internal implementation fields.

**Pseudo code:**
```typescript
const { student_id, email, first_name, last_name, profile_picture_url, ...rest } = result.rows[0];
const publicStudent = { student_id, email, first_name, last_name, profile_picture_url };
// Send only publicStudent in response
```

---

## Security Concerns

1. **No rate limiting on endpoints:** Consider applying express-rate-limit.
2. **No brute force/throttle protection on login.**
3. **No CSRF/XSS mitigation demonstrated on return values.**
4. **File upload is not properly sanitized.**

---

## Unoptimized Implementations

1. **Unnecessary select *:** Only select fields in use—avoid fetching extra data.
2. **Repeated DB queries for same student on step 2:** Combine if possible.

---

## Summary Table

| Issue Area                       | Description                                                    | Suggested Correction |
|-----------------------------------|----------------------------------------------------------------|----------------------|
| Env Variables Read                | Repeated access � cache at top                                 | See general section  |
| Sensitive Logging                 | Remove console.log of sensitive info                           | See general section  |
| Error Message Consistency         | Unify error handling & log stack trace                         | See general section  |
| JWT Secret Fallback               | Disallow fallback secret in prod                               | See general section  |
| Type Safety                       | Use interfaces, avoid `any`                                    | See general section  |
| Step 1 Transaction                | Use DB transaction for insert + send                           | See registerStep1    |
| Step 2 Password Repeat            | Check if password already set                                  | See registerStep2    |
| Step 2 Bcrypt Rounds              | Make bcrypt rounds configurable                                | See registerStep2    |
| Step 2 File Path Sanitization     | Sanitize uploaded file names                                   | See registerStep2    |
| Email Token Expiry                | Add expiry for verification token                              | See verifyEmail      |
| Email Verification Enforcement    | Must check is_verified on login                                | See loginStudent     |
| Exposing Sensitive Data           | Filter sensitive fields from student records                   | See loginStudent, profile|
| No Rate Limiting/Throttling       | Apply middleware to limit requests                             | N/A                 |

---

## Notable Good Practices

- Use of parameterized queries.
- Password hashing with bcrypt.
- Modular validation schemas.
- Secure email transport configuration.

---

# End of Report

**Apply these changes iteratively for robust, secure, industry-standard code.**