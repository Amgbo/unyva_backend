# High-Level Documentation

## Overview

This code defines data validation schemas for a two-step user registration process, specifically tailored for students at the University of Ghana. It uses the [Zod](https://github.com/colinhacks/zod) library for schema definition and validation in a TypeScript environment.

---

## Step 1: Personal Information Validation (`registerStep1Schema`)

- **Purpose:** Validates the initial registration form, which collects personal information.
- **Validated Fields:**
  - `first_name`: Required string.
  - `last_name`: Required string.
  - `student_id`: Required string.
  - `email`: Must be a valid email, ending with '@st.ug.edu.gh'.
  - `phone`: Required string, at least 10 digits.
  - `gender`: Required, must be 'Male', 'Female', or 'Other'.
  - `date_of_birth`: Required string (no special date validation).
  - `address`: Required string.

**Note:** Customized error messages are provided for each field.

---

## Step 2: Password Validation (`registerStep2Schema`)

- **Purpose:** Validates the second step, where the user sets a password.
- **Validated Fields:**
  - `password`: Required string, minimum 6 characters.
  - `confirmPassword`: Required string, minimum 6 characters.

**Note:** This step does **not** include the `student_id`.

---

## Type Inference

- **RegisterStep1Input:** TypeScript type inferred from `registerStep1Schema`.
- **RegisterStep2Input:** TypeScript type inferred from `registerStep2Schema`.

These types provide type-safe input handling throughout the application.

---

## Summary

- Provides clear, structured validation for a two-step student registration form.
- Ensures users use only University of Ghana emails and strong passwords.
- TypeScript types are inferred directly from validation schemas for strict typing and maintainability.