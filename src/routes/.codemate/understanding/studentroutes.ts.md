**High-Level Documentation: Student Routes Module**

This code defines the Express router for student-related routes in a web application. It includes endpoints for multi-step student registration, authentication, profile access, and utility/test actions. File uploads (profile picture and ID card) are handled using Multer middleware. Some routes require authentication.

### Main Features and Endpoints

1. **Student Registration**
   - **Step 1**: `POST /register-step1`
     - Handles initial student registration data submission (no file upload).
   - **Step 2**: `POST /register-step2`
     - Handles supplementary registration data and uploads files (`profile_picture` and `id_card`).

2. **Authentication & Authorization**
   - **Verify Email**: `GET /verify-email`
     - Verifies user's email via a token.
   - **Login**: `POST /login`
     - Handles login, including check for account verification.
   - **Profile Access**:
     - `GET /profile`: Returns the authenticated student's profile.
     - `GET /profile/:studentId`: Returns a profile for a specified student ID (protected).

3. **Test Route**
   - `GET /test`: Simple route to verify that student routes are operating correctly.

### Middleware Usage

- **authMiddleware**: Protects certain routes requiring the user to be authenticated.
- **multer**: Manages file uploads for registration (with destination folder `uploads/`).

### Controller Integration

- Relies on `studentController` functions for logic behind registration, login, profile retrieval, and email verification.

---

**Summary**:  
This module routes all major student-related API actions, including a multi-step registration form with file uploads, secure profile access, email verification, and login. Middleware ensures both authentication and file management, and the module is ready for integration into an Express app.