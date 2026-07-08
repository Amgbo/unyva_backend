# Security Vulnerability Report

**File:** `src/routes/studentroutes.ts`  
**Date:** 2024-06

---

## 1. File Uploads (`multer`)

### Vulnerability: Unrestricted Upload & Lack of Validation

- **Description:**  
  The code uses `multer` to upload files to the `uploads/` directory, but there is no restriction or validation of file types, file size, or file content.
- **Risk:**  
  Attackers could upload dangerous files (e.g., executables, scripts, malicious files) or very large files (leading to DoS).
- **Recommendations:**  
  - Restrict allowed file types using `fileFilter` (e.g., only `image/jpeg`, `image/png`).
  - Set a file size limit (`limits` option in multer).
  - Validate file contents as appropriate in controller.
- **Example Fix:**
    ```typescript
    const upload = multer({ 
      dest: 'uploads/',
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB size limit
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'profile_picture' || file.fieldname === 'id_card') {
          if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
          } else {
            cb(new Error('Only jpeg or png images are allowed'));
          }
        } else {
          cb(new Error('Invalid file field'));
        }
      }
    });
    ```

---

## 2. Route Authorization

### Vulnerability: Lack of Protection on Sensitive Routes

- **Description:**  
  The `/register-step2` endpoint (which handles upload of profile picture and ID) is not protected by authentication middleware (`authMiddleware`), allowing unauthenticated access.
- **Risk:**  
  Anyone can POST files to this endpoint, possibly leading to spam registration, enumeration, or resource abuse.
- **Recommendations:**  
  Require authentication or some form of registration token for `register-step2` if it should only be accessible to genuine users continuing a registration flow, or implement strong anti-abuse controls.

---

## 3. User Enumeration via `/profile/:studentId`

### Vulnerability: Predictable IDs & Insecure Direct Object Reference (IDOR)

- **Description:**  
  The route `/profile/:studentId` provides a student profile if the ID is known, with only `authMiddleware` protection. If student IDs are guessable or sequential, 
  malicious users with tokens could enumerate user profiles.
- **Risk:**  
  Information disclosure of student profiles to other authenticated users.
- **Recommendations:**  
  - Check that the requester is authorized to access the requested student's profile (ownership, permission, or role-based restrictions).
  - Use non-sequential, unpredictable IDs (UUIDs).
  - Implement logging and rate limiting.

---

## 4. Error Messages

### Vulnerability: Lack of Proper Error Handling

- **Description:**  
  There is no evidence in this code of error handling for failed uploads or authentication/authorization failures.
- **Risk:**  
  Detailed error messages or stack traces leaked to users can reveal sensitive internals or help an attacker.
- **Recommendations:**  
  - Ensure controllers and global error handlers expose only generic error messages.
  - Log detailed errors only on the server side.

---

## 5. Lack of CSRF Protection

### Vulnerability: No CSRF Protection for State-changing Requests

- **Description:**  
  POST routes (register, login, etc.) lack any mechanism for protecting against Cross-Site Request Forgery.
- **Risk:**  
  Malicious websites may be able to trigger sensitive actions on an authenticated user's behalf.
- **Recommendations:**  
  - Implement CSRF defenses if these routes can be accessed from browsers (e.g., using `csurf` middleware).
  - Ensure only tokens from trusted domains are accepted.

---

## 6. Upload Storage Directory

### Vulnerability: Potential Directory Traversal or Untrusted Storage

- **Description:**  
  Files are stored directly under `uploads/` without sanitization and without a unique per-user or per-upload directory.
- **Risk:**  
  Possible directory traversal, file overwrite, or information leakage (if files are served statically without authorization checks).
- **Recommendations:**  
  - Sanitize file names.
  - Consider storing uploads outside of the web root.
  - Use unique file names (e.g., UUID) and avoid predictable locations.
  - Ensure static file serving is disabled or protected.

---

## 7. No Rate Limiting

### Vulnerability: Route Abuse

- **Description:**  
  No rate limiting is applied, allowing attackers to brute force login, registration, or upload endpoints.
- **Risk:**  
  Denial of service or credential stuffing.
- **Recommendations:**  
  - Implement rate limiting middleware (e.g., `express-rate-limit`) on sensitive routes.

---

# Summary Table

| Area                               | Issue                                              | Risk     | Recommendation                                   |
| ----------------------------------- | -------------------------------------------------- | -------- | ------------------------------------------------ |
| File upload                        | No validation, no limits, unrestricted MIME types  | High     | Limit types, size; filter and sanitize uploads   |
| File upload access                  | `/register-step2` not protected                    | Medium   | Require authentication/tokens for upload         |
| Authorization                      | IDOR in `/profile/:studentId`                      | High     | Enforce access control on sensitive routes       |
| Error handling                     | Potential verbose error messages                   | Medium   | Send generic errors, log details server side     |
| CSRF                               | No CSRF protection for POST requests               | Medium   | Implement CSRF safeguards                       |
| Upload storage                     | No sanitization, possible traversal/overwrite      | Medium   | Sanitize, use unique names, protect directories |
| Rate limiting                      | None applied                                       | Medium   | Add rate-limiting middleware                    |

---

# Conclusion

This route file has a number of common security vulnerabilities, especially around file uploads and access control. The risks are especially high if the service is public-facing, exposes sensitive data, or processes personally identifiable information. Address the above vulnerabilities promptly before deploying to production.

**References**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)