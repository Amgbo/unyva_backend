# Code Review Report: `studentModel.ts`

---

## General Impressions

Overall, the code is clear, readable, and generally well-structured. TypeScript types are defined, and parameterized queries are used (preventing SQL injection). However, there are several issues/risks regarding security, error handling, consistency, and code robustness according to industry standards.

---

## 1. Database Error Handling

### **Issue**
- Database operations (in both methods) are not wrapped in `try...catch` blocks. Unhandled rejecteds could crash the application and make debugging/maintenance harder.

### **Correction (Pseudo code)**
```typescript
try {
  const result = await pool.query(query, values);
  return result.rows[0];
} catch (error) {
  // log the error (optionally with context)
  throw error; // or handle properly
}
```

---

## 2. Password Handling (Security Risk)

### **Issue**
- Passwords appear to be saved directly to the database (likely as plaintext).
- This is a **major security risk** and does not comply with security best practices.

### **Correction (Pseudo code)**
```typescript
const bcrypt = require('bcrypt'); // or import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, saltRounds); // saltRounds: e.g., 10
const values = [hashedPassword, profile_picture, id_card, student_id];
```

---

## 3. SQL Query: Explicit Column List on `RETURNING`

### **Issue**
- Using `RETURNING *;` is often discouraged. It can cause future maintenance issues if the schema changes, and may leak sensitive fields (such as the password).

### **Correction (Pseudo code)**
```sql
RETURNING student_id, email, first_name, last_name, phone, gender, date_of_birth, address
```
_And similarly for the update query, excluding sensitive/internal columns._

---

## 4. Data Validation and Sanitization

### **Issue**
- The function assumes all data passed conforms to requirements (no input validation). TypeScript helps, but not at runtime.

### **Suggestion**
Add input validation using a library like `Joi`, `Yup`, or similar, or at lest manual checks.

### **Pseudo code**
```typescript
if (!isValidEmail(email)) throw new Error('Invalid email format');
// similarly check for others
```

---

## 5. Date Handling Consistency

### **Issue**
- Uses `string` for `date_of_birth`, with a comment, but does not enforce or parse any consistent format (e.g., "YYYY-MM-DD"). This creates ambiguity and room for bugs.

### **Correction (Pseudo code)**
```typescript
const date = new Date(date_of_birth);
if (isNaN(date.getTime())) throw new Error('Invalid date_of_birth');
```

---

## 6. Sensitive Field Exclusion (Password)

### **Issue**
- Both `createStudentStep1` and `updateStudentStep2` may return password field.
- Should never return or expose password hashes to callers.

### **Correction (Pseudo code)**
```typescript
// Remove password from return object
const { password, ...studentWithoutPassword } = result.rows[0];
return studentWithoutPassword;
```

---

## 7. Consistent Naming & Function Structure

### **Issue**
- Minor: The function `updateStudentStep2` could be renamed for more clarity, e.g., `completeStudentRegistration`.

---

# Summary Table

| Area                  | Issue                                             | Suggested Correction                      |
|-----------------------|--------------------------------------------------|-------------------------------------------|
| DB error handling     | No `try...catch`                                 | Wrap db calls with `try...catch`          |
| Password storage      | Stores raw password                              | Hash with bcrypt before storing           |
| Column return         | Uses `RETURNING *`                               | List columns explicitly                   |
| Sensitive return      | Returns password hash                            | Remove password before returning          |
| Input validation      | No validation for inputs                         | Add basic or library-based validation     |
| Date format           | String for date, no check                        | Parse/validate date format                |
| Naming                | Slightly unclear function name                   | Use more descriptive name                 |

---

## **Summary Recommendation**

**Implement input validation, robust error handling, and password security (hashing).**  
Apply explicit field selection in SQL queries, and never leak sensitive fields (passwords), even as hashes.  
This will make the code production-grade and ready for industry compliance.

---

## **Key Pseudocode Corrections**

```typescript
// Error handling, password hashing, and sensitive field exclusion:
try {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(query, [hashedPassword, profile_picture, id_card, student_id]);
  const { password: _p, ...studentWithoutPassword } = result.rows[0];
  return studentWithoutPassword;
} catch (error) {
  // log; throw or handle error
}
```