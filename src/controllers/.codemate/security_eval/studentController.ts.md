# Security Vulnerability Report

## Overview

The provided code is an Express.js controller set for student registration and authentication, including basic info registration, email verification, password setup, profile retrieval, and login. Several third-party packages are used (`bcrypt`, `crypto`, `jsonwebtoken`, `nodemailer`, and PostgreSQL access via `pool`). Below is a detailed analysis of security vulnerabilities present in this code.

---

## Vulnerabilities

### 1. **Sensitive Information Disclosure (Logging)**

#### Issue:
- The code logs sensitive information to the console, including `req.body`, `req.files`, and student information during registration and login.
- Examples:  
  ```js
  console.log('📦 req.body:', req.body);
  console.log('🖼 req.files:', req.files);
  console.log('📋 Student found:', student ? 'Yes' : 'No');
  console.log('📋 Student has password:', !!student.password);
  console.log('📋 Student is verified:', student.is_verified);
  console.log('🔑 Password match:', match);
  ```

#### Impact:
- Logging sensitive data (emails, student IDs, password matches, etc.) can lead to information leaks, especially in production environments.

#### Recommendation:
- Remove or heavily sanitize all logging of sensitive data before deploying to production.
- Use proper log levels and ensure logs do not include personally identifiable information (PII).

---

### 2. **Hardcoded Secrets / Weak Default Secret**

#### Issue:
- The JWT secret has a hardcoded fallback value:
  ```js
  const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  ```

#### Impact:
- If the environment variable is not set, a weak or commonly known secret will be used, making JWT tokens easy to forge.

#### Recommendation:
- **Never** allow a weak or default secret.
- Fail hard if `process.env.JWT_SECRET` is not set:
  ```js
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not configured!');
  ```
- Store secrets securely (use env variables and secret managers).

---

### 3. **Missing Email Verification on Login (Commented Out)**

#### Issue:
- The check for email verification on login is commented out:
  ```js
  // if (!student.is_verified) {
  //   res.status(403).json({ error: 'Please verify your email before logging in.' });
  //   return;
  // }
  ```

#### Impact:
- Unverified users can log in, defeating the purpose of email verification and allowing possibly bogus accounts access.

#### Recommendation:
- Enforce email verification strictly. Do not disable authentication checks even for testing in production.

---

### 4. **Insecure Password Handling**

#### Issue:
- The registration flow requires `password` and `confirmPassword` fields, but no password strength validation is present.
- The bcrypt salt rounds are hardcoded to 10 (acceptable but consider making configurable).

#### Impact:
- Weak passwords may be set, making accounts vulnerable to brute-force attacks.

#### Recommendation:
- Enforce password complexity (minimum length, symbols, numbers).
- Implement rate limiting to prevent brute-force attacks on login endpoints.

---

### 5. **Potential for Email Enumeration**

#### Issue:
- Error messages are specific ("Student with this email or student ID already exists", "Invalid student ID or password").

#### Impact:
- Attackers can use the API to enumerate valid emails and student IDs.

#### Recommendation:
- Generic error messages for authentication and registration failures (e.g., "Invalid credentials") to avoid exposing which values exist in the system.

---

### 6. **Verification Token Use**

#### Issue:
- Verification tokens generated (using `crypto.randomBytes(32).toString('hex')`) are good, but **no expiry mechanism** is implemented (tokens do not expire).

#### Impact:
- Old verification links could be used indefinitely, creating opportunities for abuse.

#### Recommendation:
- Add expiry timestamps for verification tokens and enforce during verification attempts.

---

### 7. **Potential for Insecure File Uploads / Path Manipulation**

#### Issue:
- Uploaded filenames are used directly in URLs:
  ```js
  `/uploads/${profilePicFile.filename}`
  ```
- No file type/size validation, nor proper storage sanitization.

#### Impact:
- Attackers may upload executable files or manipulate file paths.

#### Recommendation:
- Validate file types (only accept images) and check sizes.
- Sanitize and store files with unique, non-user-controlled names.
- Store files outside web root or serve via controlled endpoints.

---

### 8. **Lack of Secure Headers / Session Management**

#### Issue:
- No mention of secure cookies/headers (e.g., `HttpOnly`, `Secure` for JWT), nor CORS configuration.

#### Impact:
- Opens up attack surface for XSS, CSRF, token theft, etc.

#### Recommendation:
- Use secure headers, cookies, and configure CORS appropriately.
- If JWT is stored client-side, ensure it is protected from XSS.

---

### 9. **Potential SQL Injection in Querying by ID (Low risk if using parameterized queries)**

#### Note:
- Queries use parameterization (`$1`), so risk is mitigated **unless** student IDs are not sanitized elsewhere. However, since user input is used in queries, ensure parameterization everywhere.

---

### 10. **Exposing Sensitive Data in API Responses**

#### Issue:
- The full student object is returned after registration and login:
  ```js
  res.status(200).json({ student: result.rows[0] });
  ```

#### Impact:
- May expose internal details or fields like hashed passwords if not careful.

#### Recommendation:
- Always sanitize API responses, only return necessary safe fields.

---

## Summary Table

| Vulnerability                   | Severity | Summary/Recommendation                                 |
|----------------------------------|----------|--------------------------------------------------------|
| Sensitive logging                | Medium   | Remove/obfuscate sensitive logs                        |
| Hardcoded/weak JWT secret        | High     | Require secret via ENV/secret manager                  |
| Missing email verification check | High     | Enforce verification before login                      |
| Weak password validation         | High     | Enforce password strength and rate limit login         |
| Email enumeration                | Medium   | Use generic error messages                             |
| No expiry on verification token  | Medium   | Add expiry and enforce it during verification          |
| Insecure file upload             | High     | Sanitize input, validate type, store securely          |
| Lack of secure headers/session   | Medium   | Ensure headers and secure session/token handling       |
| SQL injection (parameterized)    | Low      | Confirm parameterization everywhere                    |
| Sensitive data in responses      | Medium   | Sanitize API responses                                 |

---

## Recommendations

- **Remove debug logs, especially for sensitive data, before production.**
- **Require and securely handle JWT secrets. Fail if not set.**
- **Always enforce email verification before login.**
- **Validate password strength on registration.**
- **Return generic errors for authentication/registration.**
- **Set verification token expiry and clean up old tokens.**
- **Audit and sanitize file uploads and storage.**
- **Use secure headers, cookies, and CORS policies.**
- **Double-check parameterization for all SQL queries.**
- **Sanitize API output, only returning public-safe data.**

---

**If these issues are not remediated, the system risks unauthorized access, information leakage, and account compromise. Prioritize fixes before production deployment.**