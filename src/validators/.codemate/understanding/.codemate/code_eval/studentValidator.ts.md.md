# Code Review Report

### Scope
This review critically examines a multi-step registration schema written in TypeScript using [Zod](https://zod.dev/), focusing on:
- Industrial best practices
- Perf/optimization
- Safety, error-proneness, and maintainability

---

## **Step 1: Personal and Contact Information (`registerStep1Schema`)**

**Findings:**

1. **Email Restriction Logic**
   - **Issue:** Validating both _valid email_ and ends with `@st.ug.edu.gh` can be error-prone if just using `.endsWith`, as leading/trailing spaces can slip by, or case sensitivity may allow invalid matches.
   - **Suggestion:** Trim and lowercase the email before checking. Consider using a `.refine()` function rather than simple regex.

   > **Corrected:**
   ```
   z.string()
     .email({ message: "Invalid email address" })
     .refine(val => val.trim().toLowerCase().endsWith('@st.ug.edu.gh'), {
       message: "Email must be a University of Ghana student email (@st.ug.edu.gh)",
     })
   ```
   - *(If using input transformation, consider `.transform(val => val.trim().toLowerCase())` before validation for strong hygiene.)*

2. **Phone Number Validation**
   - **Issue:** Using `.min(10)` on a string allows, e.g., "abcdefghij". This does not ensure only digits, format, etc. 
   - **Suggestion:** Use regex to enforce 10+ digit rule, with optional country code if needed.

   > **Corrected:**
   ```
   z.string()
     .regex(/^[0-9]{10,}$/, { message: "Phone number must be at least 10 digits and contain digits only" })
   ```

3. **Gender Enum**
   - **Issue:** Strings may be typed in with case issues (‘male’, ‘FEMALE’, etc.), or extra spaces. You likely want a `.enum()` to enforce safety.
   - **Suggestion:** Use `z.enum` for explicit allowed values (enables IDE autocompletion and prevents typos).

   > **Corrected:**
   ```
   z.enum(['Male', 'Female', 'Other'])
   ```

4. **Date of Birth Validation**
   - **Issue:** Only checking for non-empty string; does not validate date format or if DOB makes user eligible (age check).
   - **Suggestion:** Use built-in date parsing or regex. Optionally, check min age if required.

   > **Example Correction:**
   ```
   z.string()
     .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date of Birth must be in format YYYY-MM-DD" })
     // Optionally refine for minimum age
   ```

---

## **Step 2: Account Security (`registerStep2Schema`)**

**Findings:**

1. **Password Confirmation**
   - **Issue:** There is no cross-field validation to ensure `password` matches `confirmPassword`.
   - **Suggestion:** Use `.refine` on the schema object to check for a match.

   > **Corrected:**
   ```
   registerStep2Schema = z.object({
     password: z.string().min(6),
     confirmPassword: z.string().min(6),
   }).refine(data => data.password === data.confirmPassword, {
     message: "Passwords do not match",
     path: ["confirmPassword"],
   });
   ```

2. **Password Complexity**
   - **Issue:** Only checks minimum length (6), which is weak for security by modern standards.
   - **Suggestion:** Add constraints (ex: at least one uppercase, one lowercase, one digit, etc.)

   > **Optional Correction:**
   ```
   z.string()
     .min(8, { message: "Password must be at least 8 characters" })
     .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
     .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
     .regex(/\d/, { message: "Password must contain at least one digit" })
   ```

---

## **Types**

**Finding:**  
Good usage of type inference with `z.infer`; no issue.

---

## **General Observations & Best Practices**

- **Transform Input:** Apply `.trim()` on user input fields (e.g., names, emails, etc.) to prevent whitespace issues.
- **Error Messages:** Ensure all error messages are user-friendly and context-specific.
- **DRY Principle:** Consider extracting repeated validation logic (e.g., phone/email checks) into shared validators, especially in large codebases.

---

## **Summary Table of Corrections**

| Issue                        | Suggestion/Correction Example                                          |
|----------------------------- |------------------------------------------------------------------------|
| Email domain validation      | `z.string().email().refine(val => val...endsWith('@st.ug.edu.gh'))`    |
| PhoneNumber digits           | `z.string().regex(/^[0-9]{10,}$/)`                                     |
| Gender strictness            | `z.enum(['Male', 'Female', 'Other'])`                                  |
| Date of Birth format         | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`                              |
| Confirm Password matching    | `.refine(data => data.password === data.confirmPassword, {...})`        |
| Password complexity          | `z.string().regex(/[A-Z]/)...`                                         |
| Input sanitization           | `.transform(val => val.trim())` on strings                             |

---

## **Conclusion**

While the overall schema design is solid and clear, several validation rules should be tightened for production readiness, security, and user experience. Please apply the corrected lines above to your codebase for best-in-class implementation.