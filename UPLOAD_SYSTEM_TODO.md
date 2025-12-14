# Upload System Refactor TODO

## Overview
Update backend to conditionally use ImageKit (production) or local filesystem (development) for file uploads.

## Storage Decision Logic
- **ImageKit**: If NODE_ENV="production" OR valid IMAGEKIT_PUBLIC_KEY + IMAGEKIT_PRIVATE_KEY exist
- **Local**: If NODE_ENV="development" OR no ImageKit keys

## Files to Update

### 1. Configuration
- `src/config/imagekit.ts`: Export conditional ImageKit client or null

### 2. Multer Configurations
- `src/routes/imageRoutes.ts`: Conditional multer (diskStorage for local, memoryStorage for ImageKit)
- `src/routes/studentroutes.ts`: Conditional multer for student uploads
- `src/routes/announcementRoutes.ts`: Conditional multer for announcements

### 3. Controllers
- `src/controllers/imageController.ts`: Conditional upload logic (products folder)
  - uploadProductImage: Handle local vs ImageKit
  - uploadMultipleProductImages: Handle local vs ImageKit
  - deleteProductImage: Delete from local disk or ImageKit
  - getImageInfo: Return local URL or ImageKit URL

- `src/controllers/studentController.ts`: Conditional upload logic (profiles/idcards folders)
  - completeRegistration: Upload profile picture and ID card
  - updateStudentProfile: Upload profile picture
  - deleteAccount: Delete images from local or ImageKit

- `src/controllers/announcementController.ts`: Conditional upload logic (announcements folder)
  - addAnnouncement: Upload announcement image
  - deleteAnnouncement: Delete announcement image

### 4. Static File Serving
- `src/index.ts`: Ensure /uploads/* serves local files (already exists)

### 5. Utility Functions
- Create helper functions for:
  - Determining storage type
  - Local file upload with folder creation
  - Local file deletion
  - URL generation for local files

## Folder Structure (Local)
```
uploads/
  profiles/     # Student profile pictures
  idcards/      # Student ID cards
  announcements/ # Announcement images
  products/     # Product images
```

## File Naming
- Local: `{timestamp}-{originalname}`
- ImageKit: Keep existing naming

## Response Format
- Local: `url: "/uploads/{folder}/{filename}"`
- ImageKit: `url: imagekitResult.url`

## Validation
- File types: JPEG, PNG, WebP
- File size: 5MB limit
- Maintain existing limits

## Testing Checklist
- [ ] Development mode: Files save to local folders
- [ ] Production mode: Files upload to ImageKit
- [ ] Static serving: Local files accessible via /uploads/*
- [ ] Deletion: Works for both local and ImageKit
- [ ] File validation: Type and size limits enforced
- [ ] URL responses: Correct format for each storage type
