# Security Vulnerability Report

## Code Summary

This code defines two Zod schemas for validating user registration data in two steps. The schema checks basic fields and types and applies minimum length constraints.

---

## Security Vulnerabilities

### 1. **Weak Password Requirements**

- **Description:**  
  The password field requires only a minimum of 6 characters (`z.string().min(6)`), allowing for passwords such as `123456`. It does not enforce complexity (capital letters, numbers, special characters).
- **Impact:**  
  Weak passwords are easy to guess or brute-force, exposing user accounts to takeover and the application to further attacks.
- **Recommendation:**
  - Enforce strong password policies including minimum length (e.g., 8 characters), and require a mix of uppercase, lowercase, numeric, and special characters.
  - Consider banning common passwords.

---

### 2. **Missing Password Confirmation Matching Validation**

- **Description:**  
  The `registerStep2Schema` validates that `password` and `confirmPassword` are strings of at least 6 characters but does **not** check if they are identical.
- **Impact:**  
  Users could submit mismatched passwords, which may cause confusion or prevent account access, possibly leading to denial of service.
- **Recommendation:**
  - Use Zod’s `.refine()` to enforce that `password` and `confirmPassword` match.

---

### 3. **Email Domain Validation is Incomplete and Bypassable**

- **Description:**  
  Email validation only checks `endsWith('@st.ug.edu.gh')`, without enforcing the domain to be at the end or preventing subdomains (e.g., `user@fake.st.ug.edu.gh.other.com`).  
  Also, this check may allow whitespace or uppercase manipulations (`user@ST.UG.EDU.GH `) to bypass validation.
- **Impact:**  
  May allow non-UG emails or malicious users to bypass domain restrictions, leading to unauthorized account creation and privilege escalation.
- **Recommendation:**
  - Normalize emails before validation (lowercase, trim whitespace).
  - Use a regex to strictly verify domain, e.g., `/^[^@]+@st\.ug\.edu\.gh$/i`.

---

### 4. **No Protection Against Injection or Malicious Payloads**

- **Description:**  
  Fields like `first_name`, `last_name`, `address`, etc., only check for non-empty strings. There’s no sanitization or length limits.
- **Impact:**  
  Attackers may submit overly long strings or inject scripts/markup that could lead to XSS if not sanitized later.
- **Recommendation:**
  - Add maximum length constraints (e.g., `max(64)`).
  - Sanitize or escape user input on output.
  - Consider using a whitelist for valid characters if applicable.

---

### 5. **No Rate Limiting or Brute Force Mitigation (Implied Risk)**

- **Description:**  
  Although not shown in the code, the presence of password fields and student IDs infers registration endpoints. No mention of rate limiting or anti-automation.
- **Impact:**  
  Without further protection, attackers could brute-force registration, leading to enumeration or spam accounts.
- **Recommendation:**
  - Implement rate limiting and captcha at the API/controller level.

---

## Summary of Recommendations

- Enforce strong password and matching requirements.
- Improve email validation robustness.
- Add input length limits and sanitize user-supplied data.
- Ensure strong protections against automation and brute-force attacks.

---

## **Code Fix Example (Selected Issues)**

```typescript
export const registerStep2Schema = z.object({
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain a lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain a number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain a special character' }),
  confirmPassword: z.string().min(8),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Improved email validation
email: z.string()
  .email({ message: 'Invalid email format' })
  .transform(val => val.trim().toLowerCase())
  .refine(val => /^[^@]+@st\.ug\.edu\.gh$/.test(val), {
    message: 'Only UNIVERSITY OF GHANA emails allowed',
  }),
```

---

> **Note:**  
> Application security is holistic. The above covers schema-level issues.  
> Additional controls (authorization, error handling, secure transmission, etc.) should be applied at higher application layers.