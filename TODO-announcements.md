# Campus Announcements Feature Implementation

## Overview
Implement campus announcements feature with admin page in the React Native app. Includes backend API, frontend screens, navigation updates, and security checks.

## Tasks

### Backend Implementation
- [ ] Create announcementController.ts in src/controllers/
  - Implement getAnnouncements() function to fetch announcements from database
  - Implement addAnnouncement() function with admin authorization check (student_id '22243185')
  - Use dummy data initially if database not ready
- [ ] Create announcementRoutes.ts in src/routes/
  - GET /api/announcements route
  - POST /api/announcements route with authentication middleware
- [ ] Update index.ts to include announcement routes
- [ ] Test backend endpoints with Postman/Curl

### Frontend Implementation
- [ ] Create AnnouncementsScreen.tsx in app/
  - Fetch announcements from GET /api/announcements
  - Display in scrollable list with title, content, created_at
  - Use clean card layout styling
  - Handle loading and error states
- [ ] Create AdminScreen.tsx in app/
  - Form with title and content fields
  - "Post Announcement" button submitting to POST /api/announcements
  - Frontend check: only show if student.student_id === '22243185', else "Access Denied"
  - Handle form validation and submission feedback
- [ ] Update home.tsx banner onPress
  - Change from Alert.alert to router.push('/announcements')
  - Update banner text/content to reflect announcements instead of special offers

### Navigation Integration
- [ ] Ensure AnnouncementsScreen and AdminScreen are accessible via Expo Router
- [ ] Add navigation links if needed (e.g., from profile or menu)

### Security & Testing
- [ ] Verify backend 403 response for non-admin POST requests
- [ ] Test frontend access control for admin screen
- [ ] Test full flow: admin posts announcement, appears in announcements list
- [ ] Handle network errors and offline states

### Database (if needed)
- [ ] Create announcements table in Postgres if not using dummy data
- [ ] Update database schema file

## Notes
- Use dummy announcements data initially: [{ id, title, content, created_at }]
- Admin student_id: '22243185'
- Ensure consistent styling with existing app theme
- Test on both iOS and Android if possible
