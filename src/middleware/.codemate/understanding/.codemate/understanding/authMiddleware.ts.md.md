# High-Level Documentation

This code defines authentication middleware functions for an Express.js application, implementing JWT (JSON Web Token) based access control. Its main features and behaviors are:

---

## 1. Middleware Components

### a. General Authentication (`authMiddleware`)
- **Purpose:**  
  Secures routes by verifying the presence and validity of a JWT in the HTTP `Authorization` header.
- **Workflow:**  
  1. Checks if the `Authorization` header exists and starts with `'Bearer '`.
  2. Extracts the JWT from the header.
  3. Uses a secret key (from environment variable, e.g., `JWT_SECRET`) to verify and decode the token.
  4. If verification succeeds, attaches the decoded token data (such as user info) to the request object (`req.user`) for downstream use.
  5. If the token is missing, invalid, or expired, responds with HTTP 401 Unauthorized.

### b. Student-Specific Verification (`verifyToken`)
- **Purpose:**  
  Provides a similar JWT-based protection mechanism, but targets "student" users, saving token data to `req.student`.
- **Workflow:**  
  1. Checks for the `Authorization` header.
  2. Extracts and verifies the JWT.
  3. Places decoded data onto `req.student`.
  4. Returns HTTP 401 (Unauthorized) for missing tokens or HTTP 403 (Forbidden) for invalid/expired tokens, with descriptive messages.

---

## 2. JWT Management
- **Verification:**  
  Both middlewares use `jsonwebtoken.verify()` to confirm token authenticity and decode payload data.
- **Configuration:**  
  The JWT secret for verification is loaded from an environment variable, allowing secure and flexible deployment.

---

## 3. Error Handling

- Responds immediately to authentication failures (missing, malformed, expired, or invalid tokens) with explanatory HTTP error codes and messages.

---

## 4. Usage and Extensibility

- After successful authentication, controllers and other middleware can access user data on the request object via `req.user` or `req.student`, facilitating personalized and secure route handling.

---

**Summary:**  
These middleware functions enforce authentication in Express.js by verifying JWTs, granting access only to requests with valid tokens, attaching decoded user information for authorized requests, and providing robust error handling for authentication issues. They are suitable for protecting both general and role-specific API routes.