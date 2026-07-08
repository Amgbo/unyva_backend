# High-Level Documentation

## Purpose

This code provides comprehensive validation for a two-step university registration form using Zod, a TypeScript schema validation library. It ensures that user inputs meet strict formatting and content requirements before proceeding to the next registration phase or account creation.

---

## Structure

### Step 1: Personal Information (`registerStep1Schema`)

Validates the following fields:

- **First Name:** Required, must be a non-empty string.
- **Last Name:** Required, non-empty string.
- **Student ID:** Required, non-empty string.
- **Email:** 
  - Must be a valid email address.
  - Must end with `@st.ug.edu.gh` (enforcing a University of Ghana email domain).
- **Phone:** Required, at least 10 digits.
- **Gender:** Must be one of `'Male'`, `'Female'`, or `'Other'`.
- **Date of Birth:** Required, non-empty string.
- **Address:** Required, non-empty string.

---

### Step 2: Account Security (`registerStep2Schema`)

Validates the following fields:

- **Password:** Required, minimum 6 characters.
- **Confirm Password:** Required, minimum 6 characters.

---

## Type Inference

- **RegisterStep1Input:** TypeScript type inferred from `registerStep1Schema`.
- **RegisterStep2Input:** TypeScript type inferred from `registerStep2Schema`.

These types facilitate type safety and seamless integration within the larger application.

---

## Summary

By splitting validation into two logical steps and using Zod schemas, the code robustly enforces field formats and required values in a university registration flow, reducing user errors and enabling reliable backend processing.