# Student Routes - High-Level Documentation

This module organizes and defines API endpoints for student-related features in a web application using Express.js. The routes facilitate a two-step registration workflow, authentication, profile management, and file uploads; they are modular, protected by middleware where necessary, and grouped for easy maintenance and extension.

---

## Core Functionalities

1. **Two-Step Registration**
   - Step 1: Initial student data submission.
   - Step 2: Upload profile picture and ID card via multipart form-data.

2. **Authentication**
   - Student login endpoint.
   - Email verification based on token.

3. **Profile Management**
   - Endpoints for students to view their own or other student profiles; protected by authentication middleware.

4. **File Handling**
   - Support for profile picture and ID upload, stored server-side.

5. **Operational Testing**
   - Simple test route to confirm API is working.

---

## Technologies and Practices Used

- **Express.js Routing**: Modular separation of logic for each route.
- **Multer**: Handles multipart file uploads for images and documents.
- **Middleware**:
  - *Authentication*: Restricts access to sensitive routes.
  - *Token Verification*: Ensures only verified students can access certain features.

---

## Route Structure

| Route                     | Method | Purpose                                               | Access                 |
|---------------------------|--------|-------------------------------------------------------|------------------------|
| `/register-step1`         | POST   | Register student with form data                       | Public                 |
| `/register-step2`         | POST   | Upload profile picture and ID card                    | Public                 |
| `/login`                  | POST   | Login for students                                    | Public                 |
| `/verify-email`           | GET    | Email verification via token                          | Public                 |
| `/profile`                | GET    | Get profile of currently authenticated student        | Authenticated only     |
| `/profile/:studentId`     | GET    | Get profile by student ID                             | Authenticated only     |
| `/test`                   | GET    | Health-check endpoint                                 | Public                 |

---

## Important Implementation Details

- Protected routes utilize authentication middleware.
- File uploads use dedicated storage directory (`uploads/`).
- Controllers abstract business logic for separation of concerns.
- Replace stubbed or placeholder logic in middleware/controllers with real functionality suited to your app.

---

## Intended Usage

This module serves as a blueprint for handling student data and authentication flows in educational, registration, or community web platforms, ensuring secure and organized management of user information and files.