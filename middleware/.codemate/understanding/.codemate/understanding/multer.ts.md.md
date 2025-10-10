**High-Level Documentation for `middleware/multer.ts`**

This module provides middleware for managing file uploads in a Node.js/Express application using the `multer` library. It includes the following key features:

- **Disk Storage Setup:**  
  Configures multer to save uploaded files directly to a specified directory on disk (commonly `'uploads/'`), allowing persistent and accessible storage of files. Make sure the folder exists and is accessible.

- **Unique File Naming:**  
  Utilizes the UUID algorithm (via `uuidv4`) to generate unique filenames for each upload, avoiding conflicts and overwriting. The original file extension is preserved to maintain file-type integrity.

- **Middleware Export:**  
  Exports a single `upload` instance, which can be attached to route handlers to handle file uploads as part of request processing.

This module streamlines secure and consistent file handling for Express applications, ensuring uploaded files are uniquely named and reliably saved to the proper location.