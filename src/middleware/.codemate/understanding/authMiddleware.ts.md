# High-Level Documentation

## Purpose

This code provides middleware functions for Express.js applications to authenticate requests using JSON Web Tokens (JWT). It ensures that only requests with valid tokens can proceed to protected routes and attaches the decoded token information to the request object for further use.

## Components

### 1. `authMiddleware`
- **Functionality**: Checks if an incoming request contains a valid JWT in the "Authorization" header.
- **Behavior**:
  - If no token is found or the header format is incorrect, responds with HTTP 401 (Unauthorized).
  - If a valid token is present, decodes it and attaches the payload to `req.user`.
  - If the token is invalid or expired, responds with HTTP 401.
- **Use case**: Protects routes by ensuring requests originate from authenticated users.

### 2. `verifyToken`
- **Functionality**: Similar to `authMiddleware`, but specifically attaches the decoded token to `req.student` rather than `req.user`.
- **Behavior**:
  - If no token is found, responds with HTTP 401.
  - If the token format is incorrect, responds with HTTP 401.
  - If the token is valid, decodes it and assigns the payload to `req.student`.
  - If the token is invalid or expired, responds with HTTP 403 (Forbidden).
- **Use case**: Used in scenarios where token information should be stored on the request as `student` rather than `user`.

## Shared Features

- Both middlewares:
  - Expect the JWT in the `Authorization` header prefixed by `Bearer`.
  - Use the secret stored in `process.env.JWT_SECRET` to verify tokens.
  - Stop request processing and respond with relevant HTTP codes if authentication fails.

## Integration

- These functions are to be used as middleware in Express.js routes to restrict access to authenticated users only:
  ```typescript
  app.use("/protected-route", authMiddleware, protectedController);
  ```
  or
  ```typescript
  app.use("/student-route", verifyToken, studentController);
  ```

## Security

- Ensures that only clients with valid JWTs can access routes secured by these middlewares.
- Provides clear, appropriate HTTP status codes for various authentication failures.

---

**Summary**:  
This code module provides JWT-based authentication middleware for Express.js applications—enabling secure user/authenticated routes by validating tokens and attaching payload data to requests for downstream processing.