# Documentation: `src/models/studentModel.ts`

## Overview

This module defines data structures and functions for handling student registration in a multi-step process, using a PostgreSQL database connection (`pool`). It primarily includes:

- The TypeScript interface describing the initial student data structure.
- Functions to create a new student entry (Step 1) and update it during registration completion (Step 2).

---

## Interface

### `StudentStep1`

Represents student information collected in the first step of registration:

- `student_id`: string — Unique student identifier.
- `email`: string — Student's email address.
- `first_name`: string — Student's first name.
- `last_name`: string — Student's last name.
- `phone`: string — Student's phone number.
- `gender`: string — Student's gender.
- `date_of_birth`: string — Student's date of birth (as string).
- `address`: string — Student's address.

---

## Functions

### `createStudentStep1(student: StudentStep1): Promise<StudentStep1>`

**Purpose:**  
Inserts a new student record into the `students` table containing the basic registration data (Step 1).

**Parameters:**  
- `student`: An object that matches the `StudentStep1` interface.

**Returns:**  
- The inserted student record as an object.

**Database Operation:**  
Executes an `INSERT INTO` statement and returns the created row.

---

### `updateStudentStep2(student_id: string, password: string, profile_picture: string, id_card: string): Promise<any>`

**Purpose:**  
Updates the student's record with credentials and required image files (Step 2).

**Parameters:**  
- `student_id`: Unique identifier for the student.
- `password`: Password string.
- `profile_picture`: Path or identifier for profile picture.
- `id_card`: Path or identifier for the ID card image.

**Returns:**  
- The updated student record as an object.

**Database Operation:**  
Executes an `UPDATE` statement for the row matching the specified `student_id`, setting the new values and returning the modified row.

---

## Notes

- All data operations use PostgreSQL parameterized queries for safety.
- The registration process is split into two steps: initial data entry and credential/upload completion.
- Returns all columns of the affected student row on creation/update for further use in the application.

---

## Dependencies

- Relies on an existing PostgreSQL pool from `db.js` for database transactions.