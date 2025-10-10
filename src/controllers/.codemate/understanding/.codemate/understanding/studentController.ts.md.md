# High-Level Documentation: Student Registration & Authentication Module

## Overview

This module serves as the backend for managing student user accounts within a web application. It covers the processes of registration, authentication, email verification, and profile access using Node.js, Express, and PostgreSQL. The system ensures security via password hashing, email confirmation, and session management using JWT tokens.

---

## Main Features

### 1. Two-Step Student Registration

- **Step 1:** Collects initial student information, validates data, checks for duplicates, and sends a verification email containing a unique token.
- **Step 2:** Collects password and file uploads (profile image and ID card), validates inputs, securely hashes the password, and updates the student record.

### 2. Email Verification

- Validates the student's account using a token sent via email. Only verified accounts can log in.

### 3. Authentication

- Allows verified students to log in using their ID and password, issuing a JWT token on success for authenticated sessions.

### 4. Profile Management

- Students can retrieve their own profile data.
- Admins (or authorized users) can access student profiles by student ID.

---

## Technology Stack

- **Node.js/Express:** REST API server and routing
- **PostgreSQL:** Persistent student data storage
- **bcrypt:** Password hashing for security
- **crypto:** Random token generation for email verification
- **jsonwebtoken (JWT):** Stateless authentication for requests
- **nodemailer:** Email dispatch for registration confirmation
- **zod:** Input validation
- **Environment variables:** Secrets and configurations

---

## Security & Error Handling

- Input validation across endpoints
- Passwords never stored in plain text
- Mandatory email verification before granting account access
- Consistent error reporting and HTTP status codes
- Use of environment variables for secrets and credentials
- File uploads handled externally; only URLs stored internally

---

## API Endpoints

| Endpoint                    | Description                                   |
|-----------------------------|-----------------------------------------------|
| POST /register/step1        | Begin registration & send verification email  |
| POST /register/step2        | Complete registration with password & uploads |
| GET  /verify-email?token    | Confirm email address using token             |
| POST /login                 | Student login, receive JWT session token      |
| GET  /profile               | Get current (logged-in) student's profile     |
| GET  /profile/:studentId    | Get any student profile by ID                 |

---

## Typical Workflow

1. **Registration:** Student creates account (step 1), receives & clicks verification email, completes registration (step 2).
2. **Authentication:** Student logs in with ID and password after verification.
3. **Access:** Student or admin retrieves profile info when needed.

---

## Notes

- File storage and authentication middleware are handled separately.
- Email verification can be disabled for testing but must remain enabled in production.
- All sensitive credentials are environment-configured for security.

---

## Summary

This module provides a secure, robust framework for student registration, verification, login, and profile management, suitable for educational web platforms requiring user authentication and validation.