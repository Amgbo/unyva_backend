# Security Vulnerability Report: `middleware/multer.ts`

## Overview

This report reviews the `middleware/multer.ts` code for security vulnerabilities related to its implementation of file uploads using `multer`.

---

## Code Summary

- Uses multer to store uploaded files on disk.
- Files are saved under the `uploads/` directory, with a UUID as the name plus the original extension.

---

## Identified Security Vulnerabilities

### 1. **Unrestricted File Upload**

**Description:**  
The code does not restrict the type or size of files that can be uploaded. This may allow uploads of malicious files (such as executables, scripts) or overly large files that exhaust system resources.

**Recommendations:**
- Use the `fileFilter` option to restrict allowed MIME types (e.g., only images or documents).
- Set limits for file size with the `limits` option.

**Example:**
```typescript
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow certain file types
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});
```

---

### 2. **Directory Traversal**

**Description:**  
Although file names are sanitized with a UUID, the code does not validate the destination directory. If the `uploads/` directory is not properly configured, attackers could potentially exploit path traversal vulnerabilities by manipulating the destination path in a different context.

**Recommendations:**
- Ensure that the destination directory (`uploads/`) is not user-controllable and is outside the web root, to prevent direct access via URL.
- Sanitize or strictly define paths on the server side.

---

### 3. **Serving Uploaded Files**

**Description:**  
The code does not address how uploaded files are served. If the `uploads/` directory is publicly accessible, attackers may upload files containing malicious scripts that can be executed when accessed.

**Recommendations:**
- Store uploads outside publicly accessible directories.
- Serve files only through routes with strict authentication and authorization.
- Remove executable permissions from uploaded files.

---

### 4. **File Name Extension Trust**

**Description:**  
The code preserves the original extension from `file.originalname`, which may be misleading or allow hiding malicious files (e.g., `.php.jpg`).

**Recommendations:**
- Determine MIME type server-side (e.g., using `file-type` module) and enforce correct extensions.
- Consider renaming all files to a fixed extension based on validated type.

---

### 5. **Absence of Antivirus Scanning**

**Description:**  
There is no check for malware in uploaded files.

**Recommendations:**
- Integrate scanning using a tool like ClamAV for additional protection.

---

## Summary Table

| Vulnerability                  | Severity | Recommendation                              |
|-------------------------------|----------|----------------------------------------------|
| Unrestricted file upload      | High     | Filter MIME types and set size limits        |
| Directory traversal           | Medium   | Sanitize and limit storage paths             |
| Publicly accessible uploads   | High     | Store files outside web root; restrict access|
| Extension trust               | Medium   | Validate MIME type, restrict extension       |
| No malware scanning           | Medium   | Integrate antivirus scanning                 |

---

## Overall Security Recommendations

- Always validate and restrict file uploads.
- Store and serve uploaded files securely.
- Sanitize file names and paths.
- Perform antivirus/malware scans.
- Limit file types, sizes, and permissions.

---

**Note:** The implementation above is vulnerable to several common and critical file upload security issues. Address these promptly to protect your application and infrastructure.