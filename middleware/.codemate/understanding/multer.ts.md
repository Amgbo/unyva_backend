# High-Level Documentation: Multer Middleware Configuration

**Purpose:**  
This module sets up and exports a file upload middleware using [multer](https://github.com/expressjs/multer) for handling multipart/form-data (primarily used for file uploads) in a Node.js Express application.

**Main Features:**

1. **Disk Storage Engine:**  
   - Uploaded files are stored on disk (in the server's filesystem).

2. **Destination Folder:**  
   - All files are saved to the `uploads/` directory.
   - (Note: This folder must exist in your project structure.)

3. **Custom Filename Generation:**  
   - Each uploaded file is renamed using a [UUID v4](https://www.npmjs.com/package/uuid) string to ensure uniqueness, appended with its original file extension.

4. **Exported Middleware:**  
   - The configured multer instance (`upload`) can be used as middleware for Express routes to handle file uploads.

**Usage Example:**
```typescript
import { upload } from './middleware/multer';

// Single file upload endpoint
app.post('/profile', upload.single('avatar'), (req, res) => {
  res.send('File uploaded!');
});
```

**Summary:**  
This code provides a secure and organized way to handle and store uploaded files in an Express application, minimizing filename collisions and storing files in a dedicated directory.