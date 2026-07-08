# Security Vulnerability Report: `src/models/studentModel.ts`

---

## 1. Password Storage (Critical)

**Issue:**  
In the `updateStudentStep2` function, the user's password is inserted directly into the database:

```ts
SET password = $1, ...
const values = [password, ...]
```

**Analysis:**  
There is no indication in this file that passwords are hashed or otherwise protected before being stored. Storing plain text passwords is a significant security vulnerability and exposes users to credential theft in the event of a data breach.

**Recommendation:**  
- **Never** store plain text passwords.
- Hash passwords using a strong algorithm (e.g., bcrypt, argon2) before storing.
- Ensure the hashing process happens *before* this function is called, or integrate it here.

---

## 2. Sensitive Data Exposure: Image Uploads

**Issue:**  
The `profile_picture` and `id_card` are being stored as strings. There is no indication these strings are validated or sanitized.

**Analysis:**  
- If these are file paths or blob references, malicious input could allow path traversal or injection attacks, depending on how these fields are used elsewhere.
- If storing URLs or paths, ensure they are properly validated and sanitized before storage or usage.

**Recommendation:**  
- Restrict the format and location of file uploads.
- Validate and sanitize any inputs referencing files.

---

## 3. SQL Injection: Risk Assessment

**Issue:**  
All queries use **parameterized SQL** (`$1, $2, ...`), which is correct and mitigates *most* SQL injection risks.

**Analysis:**  
- Assuming `pool.query` is from a reputable library (`pg` for PostgreSQL), this largely secures queries from classic injection.
- Ensure that all code paths use parameterized queries.

**Recommendation:**  
- Maintain the use of parameterized queries everywhere.
- Avoid any dynamic SQL construction with user input.

---

## 4. Information Leakage via `RETURNING *`

**Issue:**  
Both functions (`createStudentStep1` and `updateStudentStep2`) use `RETURNING *;`, returning the entire row after database operations.

**Analysis:**  
If the entire student object is sent back to an API response, especially after registration or password change, this could leak sensitive information (including the hashed password).

**Recommendation:**  
- *Never* include sensitive fields (such as `password`) in response objects.
- Explicitly specify which fields are returned in the query, or filter the response object server-side before returning to clients.

---

## 5. Lack of Input Validation

**Issue:**  
No input validation is performed in this layer for any field.

**Analysis:**  
Maliciously crafted input may:
- Circumvent business logic.
- Allow storage of invalid or malicious data (XSS vectors, SQL wildcards, etc.), especially if data is rendered elsewhere in the application.

**Recommendation:**  
- Implement strong schema validation (using e.g., `joi`, `zod`, or similar libraries) at the API/controller layer before data is passed to the model.
- Use type checks and regular expressions as appropriate for email, phone, etc.

---

## Summary Table

| Vulnerability          | Severity | Details                                                          | Remediation                |
|------------------------|----------|------------------------------------------------------------------|----------------------------|
| Plain text password    | Critical | Passwords stored without hashing                                 | Hash before storing        |
| Sensitive image fields | Medium   | No sanitization/validation of image fields                       | Validate/sanitize inputs   |
| SQL Injection          | -        | Avoided by parameterized queries                                 | Continue best practices    |
| Data leakage           | High     | `RETURNING *` may leak sensitive info (e.g., password)           | Restrict returned fields   |
| Input validation       | High     | No input validation of user data                                 | Validate inputs upstream   |

---

## Final Recommendations

1. **Implement password hashing.**
2. **Validate and sanitize all user-uploaded image references.**
3. **Limit fields returned from DB queries.**
4. **Integrate input validation upstream from the model.**

---

**Note:** If this model is only part of the application, also ensure these security best practices are followed in controllers, API layers, and elsewhere that handles user data.