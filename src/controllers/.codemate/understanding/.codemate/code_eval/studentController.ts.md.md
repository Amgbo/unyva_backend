# Code Review Report

---

## Overview

The reviewed module (Student Registration & Authentication) is well-documented and clearly outlines its high-level design and security intents. This review focuses on **industry best practices**, detection of **unoptimized or incorrect implementations**, and suggests **concrete improvements** in the form of **pseudo code** corrections only, as per instruction.

---

## Critical Issues

### 1. Password Storage Best Practices

#### Issue
- The documentation says passwords are hashed with `bcrypt` (good) but does not specify the salt rounds/cost, nor does it mention which field stores the hash.
- Lack of salt round configuration = future security risk (bcrypt default in some libraries is too low as hardware evolves).

#### Correction
```pseudo
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || 12
hashedPassword = bcrypt.hashSync(userInputPassword, SALT_ROUNDS)
-- Store hashedPassword in the `password_hash` field (never a password column)
```

---

### 2. Token Generation and Security

#### Issue
- The verification token is generated with `crypto`, but not enough entropy details are given.
- Tokens used for verification should be securely random AND expire after reasonable time.

#### Correction
```pseudo
const token = crypto.randomBytes(32).toString('hex')
const expiresAt = Date.now() + EMAIL_TOKEN_EXPIRY_WINDOW_MS   // e.g., 24 hours
-- Store token and expiresAt with student's record
```

---

### 3. File Upload Validation

#### Issue
- "Checks file presence," but should ensure **type and size validation** to prevent security vulnerabilities (e.g., uploading scripts).

#### Correction
```pseudo
if (!isValidFileType(uploadedFile, allowedTypes)) {
    return error("Invalid file type")
}
if (uploadedFile.size > MAX_UPLOAD_SIZE) {
    return error("File too large")
}
```

---

### 4. Email Uniqueness Race Condition

#### Issue
- Simple check for duplicate emails **before** inserting is prone to race conditions (e.g., concurrent registration).
- Must enforce **unique constraints at the database level** and handle duplicate key errors gracefully.

#### Correction
```pseudo
TRY
    INSERT INTO students (email, student_id, ...)
CATCH error
    IF error.code == '23505' THEN      // Postgres unique violation
        return error("Email or student ID already exists")
```

---

### 5. JWT Implementation

#### Issue
- JWT Secret should be critical. Documentation does not specify expiration or signing algorithm.

#### Correction
```pseudo
const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
    algorithm: 'HS256'
})
```

---

### 6. Email Verification Logic

#### Issue
- Should check token expiration and invalidate used tokens.

#### Correction
```pseudo
if (now > student.verify_token_expiry) {
    return error("Verification token has expired. Please register again.")
}
student.is_verified = true
student.verify_token = NULL   // Invalidate after use
student.verify_token_expiry = NULL
```

---

### 7. Sensitive Information Exposure

#### Issue
- Profile endpoints (`getStudentProfile`, `getStudentProfileById`) may expose sensitive information (e.g., email, phone, hashed password) to unauthorized users/admins.

#### Correction
```pseudo
result = SELECT fields FROM students WHERE student_id = ... 
-- Only return non-sensitive fields (e.g., do NOT return password_hash)
```
```pseudo
if (requestor_role != 'admin') {
    -- Hide all contact/personal details except allowed fields
}
```

---

### 8. Input Validation Consistency & Sanitization

#### Issue
- "Validates input" is claimed, but be explicit: Validate **email format**, **student ID pattern**, sanitization against SQL injection (prefer prepared statements), etc.

#### Correction
```pseudo
if (!validator.isEmail(input.email)) { return error("Invalid email") }
if (!/^[A-Z0-9]{8,}$/.test(input.student_id)) { return error("Invalid student ID") }
-- Always use parameterized queries:
pool.query("INSERT INTO ... VALUES ($1, $2, ...)", [val1, val2, ...])
```

---

### 9. Authentication Middleware Reusability

#### Issue
- JWT authentication middleware should be generic and reusable, verifying JWTs and attaching student info to the request context.

#### Correction
```pseudo
function jwtMiddleware(req, res, next) {
    token = parseAuthorizationHeader(req)
    try
        payload = jwt.verify(token, process.env.JWT_SECRET)
        req.student = payload
        next()
    catch error
        res.status(401).json({error: "Invalid token"})
}
```

---

## Minor / Enhancement Suggestions

- **Rate Limiting**: Add rate-limiting for sensitive routes (register, login) to mitigate brute force.
- **Logging**: Add structured logging for security-related events (failed logins, token misuse).
- **Internationalization**: Consider localization for error messages if supporting multiple languages later.

---

## Summary

The module's design is fundamentally sound. Address the **explicit handling** for password hashing parameters, token expiry, file validation, uniqueness enforcement, JWT expiration, sensitive info redaction, and robust input validation for production readiness and industry compliance.

---