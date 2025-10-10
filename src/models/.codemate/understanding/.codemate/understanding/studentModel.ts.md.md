# High-Level Documentation: `studentModel.ts`

## Overview

This module provides functions for managing student registration records in a PostgreSQL database, supporting a **two-step registration process**.

---

## Data Model

- **StudentStep1 Interface**:  
  Defines the required fields for the initial registration, including:
  - Student ID
  - Email
  - Full name
  - Contact details
  - Gender
  - Date of birth
  - Address

---

## Functions

### 1. `createStudentStep1(student: StudentStep1)`

- **Purpose**:  
  Creates a new student entry with core contact and identity information.
- **Inputs**:  
  Object complying with the `StudentStep1` structure.
- **Returns**:  
  The new row representing the student.

### 2. `updateStudentStep2(student_id, password, profile_picture, id_card)`

- **Purpose**:  
  Updates an existing student by setting the password and uploading file paths for profile photo and ID card, finalizing the registration.
- **Inputs**:  
  - Student ID
  - Password string
  - Profile picture path (string)
  - ID card path (string)
- **Returns**:  
  The updated student row.

---

## Database Integration

- Uses a PostgreSQL connection pool for executing all queries.

---

## Usage Scenario

- **Step 1**: Collects personal and contact details.
- **Step 2**: Adds authentication credentials and required ID images.

Both steps ensure progressive data entry for student registrations.

---

## Additional Notes

- Assumes validation (e.g., password rules, image checks) occurs elsewhere.
- All functions return the associated database row after creation or update.