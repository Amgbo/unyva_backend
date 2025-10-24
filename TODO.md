# TODO: Add Image Support for Announcements

## Overview
Add optional image upload functionality to announcements, allowing admins to include images when posting announcements.

## Backend Tasks
- [x] Update announcements table schema to add image_url column
- [x] Modify announcementController.ts to handle image uploads
- [x] Update announcementRoutes.ts to support image uploads with multer
- [ ] Test image upload functionality for announcements

## Frontend Tasks
- [ ] Update admin.tsx to include image picker/upload functionality
- [ ] Update announcements.tsx to display images when available
- [ ] Add image preview in admin form
- [ ] Test complete image upload and display flow

## Database Migration
- [x] Create migration script to add image_url column to announcements table
- [x] Run migration on database

## Testing
- [ ] Test announcement posting with image
- [ ] Test announcement posting without image
- [ ] Test announcement display with and without images
- [ ] Verify image validation and error handling

---

# TODO: Fix Registration Form Submission (404 Error)

## Analysis
- Frontend sends POST to /api/students/complete-registration
- Backend returns 404 HTML error page instead of JSON
- Route exists in code but may not be deployed on Railway
- Frontend error handling needs improvement for HTML responses

## Backend Tasks
- [ ] Verify completeRegistration route is in studentroutes.ts ✅ (Already exists)
- [ ] Verify completeRegistration controller handles FormData ✅ (Already implemented)
- [ ] Deploy updated backend code to Railway
- [ ] Test route accessibility on deployed backend

## Frontend Tasks
- [ ] Improve error handling in register-step2.tsx to always log raw response text
- [ ] Ensure FormData is sent correctly (already done)
- [ ] Test submission after backend deployment

## Testing
- [ ] Submit registration form after fixes
- [ ] Verify 200 response with JSON
- [ ] Confirm images uploaded and student created
