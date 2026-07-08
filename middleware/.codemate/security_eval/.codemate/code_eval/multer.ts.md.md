# Code Review Report for `middleware/multer.ts`

This report contains a **critical review** of the security, optimization, and correctness of your Multer middleware implementation. Each issue is cross-referenced with industry best practices, and recommended **code changes** (in pseudo code, as requested) are presented for **direct application** — not full code rewrites.

---

## 1. File Type Validation Missing

**Critical Issue:**  
**No file type restriction** is enforced. This is a severe security issue, as attackers may upload malicious files.

**Fix – Code Addition:**
```typescript
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'), false);
  }
  cb(null, true);
};
```
**Integrate**:
```typescript
export const upload = multer({ storage, fileFilter });
```

---

## 2. Directory Path Hardening (Path Traversal Prevention)

**Issue:**  
Upload directory is a static string, but risk persists if it ever becomes user-controllable.

**Fix – Code Correction:**
```typescript
const uploadPath = path.join(__dirname, '../uploads/');
```
*Use this in storage.*  
**Never use user-supplied input for paths.**

---

## 3. File Overwrite Risk & Filename Collisions

**Issue:**  
`uuidv4()` highly reduces collision chance, but if `uuid` not used, or extension logic is wrong, collisions occur; some file systems are case-insensitive.

**Mitigation:**
```typescript
// Always use uuid for filenames and log file creation
const filename = uuidv4() + sanitizedExtension;
if (fs.existsSync(path.join(uploadPath, filename))) {
  // Log collision and abort upload (should never happen)
  return cb(new Error('File collision detected'), false);
}
```
*Also consider central logging of upload events.*

---

## 4. Directory Creation Guarantee

**Issue:**  
There is a runtime risk if the upload directory is missing.

**Fix – Implementation for Startup:**
```typescript
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true, mode: 0o700 });
}
```
*Place in main server startup, not in the route.*

---

## 5. File Extension Validation and Sanitation

**Critical:**  
Do **not** just append `path.extname(file.originalname)`. User can upload `file.jpg.exe`.

**Corrected Code:**
```typescript
// Extract extension from detected mimetype, not from originalname
const extensionMap = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};
const sanitizedExtension = extensionMap[file.mimetype] || '';
```
*Never trust `path.extname(file.originalname)` for extension.*

---

## 6. File Access Control

**Major Issue:**  
Do **not** expose the `uploads/` directory via Express `static` middleware.

**Fix – Policy:**
- Serve files only via routes that authenticate and authorize users.
- Never use:
  ```typescript
  app.use('/uploads', express.static('uploads')); // REMOVE THIS
  ```
- Instead, use a route with checks:
  ```typescript
  app.get('/download/:fileId', authenticateUser, (req, res) => {
    // Check permissions, then stream file
  });
  ```

---

## 7. Permissions

**Security Best Practice:**  
Set upload directory to `0700` (owner read/write/execute).

---

# Summary Table

| Issue                      | Severity | Action (with code)                                           |
|----------------------------|----------|--------------------------------------------------------------|
| File type validation       | HIGH     | Add `fileFilter` as above                                    |
| Path traversal             | HIGH     | Use `path.join(__dirname, ...)` for static path              |
| File overwrite/collision   | MEDIUM   | Use `uuidv4`, check existence, log collisions                |
| Directory existence        | MEDIUM   | `fs.mkdirSync(.., 0o700)` on startup                         |
| Extension trust            | HIGH     | Map extension from mimetype, NOT `originalname`              |
| Access control to uploads  | HIGH     | Do NOT use express.static, always authorize file serving     |

---

# Immediate To-Do List

1. **Add a secure `fileFilter`.**
2. **Map file extensions using mimetype lookup, not user input.**
3. **Ensure upload directory is created at startup with strict permissions.**
4. **Confirm uploaded files are never statically served.**
5. **Log every upload and any anomaly.**
6. **Use only absolute, static upload paths.**

---

**References:**
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Multer Security Best Practices](https://github.com/expressjs/multer#security-considerations)

**End of review – apply the above code snippets in your implementation as fixes.**