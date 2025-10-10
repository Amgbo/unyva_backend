# Code Review Report

---

## Review Focus

Critically examining your code for:
- Strict industry standards (security, maintainability, input validation)
- Unoptimized implementations
- Errors or missing checks

---

## Key Issues & Proposed Corrections

### 1. **Password Confirmation Validation**

**Problem**:  
- `confirmPassword` field exists, but the code doesn't enforce that it matches `password`.

**Correction (pseudo-code)**:
```typescript
// After defining registerStep2Schema
registerStep2Schema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
```

---

### 2. **Date of Birth Validation**

**Problem**:  
- `date_of_birth` accepts any non-empty string.
- No check for valid date **format** or whether it represents a real date (e.g., "2023-02-31" passes).

**Correction (pseudo-code)**:
```typescript
date_of_birth: z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date of birth must be YYYY-MM-DD format" })
  .refine((date) => {
    // Optional: check if the parsed date is valid
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }, { message: "Invalid date" }),
```

---

### 3. **Phone Number Validation**

**Problem**:  
- Only minimum length (`min(10)`) enforced. No check for valid digits.

**Correction (pseudo-code)**:
```typescript
phone: z.string()
  .regex(/^\d{10,}$/, { message: "Phone number must be at least 10 digits and contain only numbers" }),
```

---

### 4. **Email Domain Maintainability**

**Problem**:  
- Domain is hardcoded where check occurs.
- Better to use a constant.

**Correction (pseudo-code)**:
```typescript
const UNIVERSITY_EMAIL_DOMAIN = "@st.ug.edu.gh";
email: z.string()
  .email({ message: "Invalid email format" })
  .endsWith(UNIVERSITY_EMAIL_DOMAIN, { message: `Email must end with ${UNIVERSITY_EMAIL_DOMAIN}` }),
```

---

## Additional Suggestions

- Ensure error messages are **consistent** and user-friendly.
- If you expect TypeScript inference, explicitly export types for schemas:  
  `export type RegisterStep2Input = z.infer<typeof registerStep2Schema>`  
  (if not already done).

---

## Summary Table

| Problem Area              | Proposed Fix (pseudo-code)                                                          |
|--------------------------|--------------------------------------------------------------------------------------|
| Password Confirmation    | Use `.refine` to check equality                                                     |
| Date of Birth Format     | Use `.regex` (and optional `.refine` for real date validation)                      |
| Phone Digits             | Use `.regex` for digits only                                                        |
| Email Domain             | Use a constant for domain matching                                                  |

---

## Conclusion

Apply these corrections to adhere to modern software development standards. 
- Enforcing strong input validation is critical for both UX and security.
- Maintainability is improved by centralizing config-like constants.
- Always ensure related user input fields are coordinated (password/confirm).
- Prefer explicit runtime validation for all critical user fields.