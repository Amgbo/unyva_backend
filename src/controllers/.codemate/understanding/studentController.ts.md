# High-Level Documentation: Student Registration and Authentication System

This code provides a set of API endpoints to manage student registration, authentication, and profile retrieval for a web application. The system is built using Node.js (TypeScript) and leverages several popular libraries including Express, JWT, bcrypt, nodemailer, and PostgreSQL (via a connection pool).

## Features

### 1. Student Registration (Two-Step)

#### **Step 1: Basic Info & Email Verification**
- **Endpoint:** `registerStep1`
- **Functionality:** Receives basic student info (ID, email, name, etc.), validates it, checks for duplicate accounts, generates a unique email verification token, saves the student record (as unverified) in the database, and sends a verification email.
- **Email Sending:** Utilizes Gmail via nodemailer.
- **Field Validation:** Uses external schema validator (`registerStep1Schema`).

#### **Step 2: Upload Documents & Set Password**
- **Endpoint:** `registerStep2`
- **Functionality:** Allows uploading a profile picture and ID card, verifies password and confirm-password match, hashes password, and updates the student record with document URLs and the password.
- **File Handling:** Expects uploaded files via `req.files`.
- **Field Validation:** Uses external schema validator (`registerStep2Schema`).

### 2. Email Verification
- **Endpoint:** `verifyEmail`
- **Functionality:** Accepts a verification token from the query string, marks student account as verified if the token is valid, clears the verification token.

### 3. Authentication (Login)
- **Endpoint:** `loginStudent`
- **Functionality:** Allows students to log in using their ID and password. Checks credentials, optional email verification, and issues a JWT token on successful authentication.
- **Password Security:** Uses bcrypt for password hashing and verification.
- **JWT:** Encodes student information into a token valid for 7 days.

### 4. Profile Retrieval
- **Logged-In Student’s Profile**
  - **Endpoint:** `getStudentProfile`
  - **Functionality:** Retrieves the profile of the student associated with the JWT token from the request (`req.user`).
- **Profile by Student ID**
  - **Endpoint:** `getStudentProfileById`
  - **Functionality:** Allows fetching a student’s profile by ID (for admin/lookup scenarios).

## Security & Validation
- All critical operations include input validation and error handling.
- Passwords are securely hashed before being stored.
- JWT secrets should be managed carefully and changed in production.
- Email verification is required before login (commented for testing).

## Technologies Used
- **Express:** For RESTful API endpoints.
- **bcrypt:** For password security.
- **crypto:** For random token generation.
- **nodemailer:** For transactional email.
- **jsonwebtoken:** For token-based authentication.
- **PostgreSQL:** For persistent data storage.
- **Schema Validators:** For request validation (external modules).

## Error Handling
- Handles validation, duplicate entries, database errors, missing files, authentication failure, and unauthorized access.

## Deployment Considerations
- Environment variables (`EMAIL_USER`, `EMAIL_PASS`, `BASE_URL`, `JWT_SECRET`, etc.) must be set for proper operation.
- Uploaded files are referenced by server-side upload paths (ensure correct static serving).
- The database schema for `students` should match the expectations in the queries.

---

This documentation outlines the primary workflows implemented in the code, focusing on registration, email verification, authentication, and profile access for student accounts.