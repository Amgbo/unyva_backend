-- Allow one student to create multiple guides.
-- Remove the unique constraint on student_id and add a composite unique key
-- so a student can still not register the exact same department twice.
ALTER TABLE guides
  DROP CONSTRAINT IF EXISTS guides_student_id_key;

-- Optional: prevent duplicate identical guide profiles for the same student.
ALTER TABLE guides
  ADD CONSTRAINT guides_student_department_unique UNIQUE (student_id, department);
