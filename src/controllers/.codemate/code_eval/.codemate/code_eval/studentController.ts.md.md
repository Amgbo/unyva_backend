```markdown
# Critical Code Review Report

## General Observations

- **Error Handling:** Generally robust, but may miss edge-case DB errors.
- **Validation:** Good use of zod for body validation. Missing validation for file uploads and query/query params.
- **Security:** Hashing and JWT implemented, but some critical flaws.
- **Logging:** Excessive and sensitive data in `console.log`.
- **JWT Secrets & Env:** Hardcoded fallback risks, not industry standard.
- **Performance:** Minor query optimization needed (e.g., use of `SELECT *`).

---

## Detailed Issues & Corrective Code Suggestions

### 1. **Logging Sensitive Data**

**Issue:**  
Excessive use of `console.log` leaks sensitive data (user info, JWT secrets, etc).

**Suggestion:**  
Remove or switch to a secure logger, and mask sensitive data for production.

**Code Correction (pseudo):**
```ts
// Remove these in production or use log level checks/logger:
console.log('📦 req.body:', req.body); // Remove
console.log('🖼 req.files:', req.files); // Remove
console.log('🔑 Using JWT secret:', jwtSecret); // Remove
```

---

### 2. **JWT Secret Fallback**

**Issue:**  
JWT secret defaults to a weak string if env var missing.

**Suggestion:**  
Abort if JWT secret is missing.

**Code Correction (pseudo):**
```ts
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const jwtSecret = process.env.JWT_SECRET;
```

---

### 3. **Password Policy & Bcrypt Strength**

**Issue:**  
No password strength check, fixed low salt rounds, vulnerable to weak passwords.

**Suggestion:**  
- Add password complexity to validation schema.
- Extract salt rounds to environment with recommended defaults.

**Code Correction (pseudo):**
```ts
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const hashedPassword = await bcrypt.hash(password, saltRounds);
```
*Also, add zod schema/password regex.*

---

### 4. **File Uploads: Validation and Filename Sanitization**

**Issue:**  
Files can be unsafe (wrong type, wrong size, path traversal attacks).

**Suggestion:**  
Validate file type, size, and sanitize filename.

**Code Correction (pseudo):**
```ts
if (!isValidImage(profilePicFile) || !isSafeFilename(profilePicFile.filename)) {
  res.status(400).json({ error: "Invalid image upload." });
  return;
}
```

---

### 5. **Email Verification: Token Expiry**

**Issue:**  
Verification tokens never expire; can be reused indefinitely.

**Suggestion:**  
Store creation timestamp and only allow verification within a time window.

**Code Correction (pseudo):**
```sql
-- On verify
UPDATE students SET is_verified = TRUE
WHERE verification_token = $1 AND verification_token_created_at > NOW() - INTERVAL '24 HOURS'
```

---

### 6. **SQL Query Optimization**

**Issue:**  
Usage of `SELECT *` exposes all fields, inefficient.

**Suggestion:**  
Only select necessary columns.

**Code Correction (pseudo):**
```sql
SELECT student_id, email, first_name, last_name FROM students WHERE student_id = $1
```

---

### 7. **Enforcing Unverified Login Block**

**Issue:**  
Login for unverified users allowed (commented-out block for testing).

**Suggestion:**  
Enforce email verification check before login.

**Code Correction (pseudo):**
```ts
if (!student.is_verified) {
  res.status(403).json({ error: 'Verify your email before logging in.' });
  return;
}
```

---

### 8. **Query Parameter Token Validation**

**Issue:**  
`req.query.token` is used without strong validation (could be tampered).

**Suggestion:**  
Validate token format (length and allowed chars).

**Code Correction (pseudo):**
```ts
if (!token || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
  res.status(400).json({ error: "Invalid token format." });
  return;
}
```

---

### 9. **Race Condition: Registration**

**Issue:**  
Duplicate registration possible (check and insert not atomic).

**Suggestion:**  
Use DB unique constraints, catch duplicate key errors.

**Code Correction (pseudo):**
```ts
try {
  await pool.query(INSERT ...);
} catch (e) {
  if (isDuplicateKeyError(e)) {
    res.status(409).json({ error: 'Already registered.' });
    return;
  }
  throw e;
}
```

---

### 10. **`any` Types in Profile Getter**

**Issue:**  
`any` is used for request, type safety lost.

**Suggestion:**  
Extend Express `Request` for auth.

**Code Correction (pseudo):**
```ts
interface AuthRequest extends Request {
  user: { student_id: string }
}
export async function getStudentProfile(req: AuthRequest, res: Response) { ... }
```

---

## Summary Table

| Issue                                 | Severity    | Fix                                 |
|----------------------------------------|-------------|-------------------------------------|
| Sensitive logging                     | High        | Remove or secure logging            |
| JWT fallback                          | High        | Abort; demand env var               |
| Password policy/salt                  | High        | Enforce schema/environ salt         |
| File upload validation/sanitization    | Critical    | Check mime/type/filename            |
| Email verification token expiry        | Medium      | Add expiry window                   |
| SELECT * queries                      | Low         | Select only required columns        |
| Unverified login allowed              | Critical    | Block; return error                 |
| Token validation (query param)         | Medium      | Regex and length check              |
| Registration race (duplicates)         | High        | Handle unique violations            |
| any types (`AuthRequest`)              | Medium      | Use type-extended Request           |

---

> **DO NOT deploy until all critical/severe items above are reviewed and resolved.**

---

**End of Report**
```
