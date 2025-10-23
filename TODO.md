# TODO: Replace Cloudinary with ImageKit

## Dependencies
- [ ] Remove cloudinary and multer-storage-cloudinary from package.json
- [ ] Install imagekit, multer, @types/multer

## Configuration
- [ ] Create src/config/imagekit.ts with ImageKit instance
- [ ] Update .env with IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT

## Middleware & Routes
- [ ] Update src/middleware/upload.ts to use multer.memoryStorage()
- [ ] Update src/routes/imageRoutes.ts to use memory storage
- [ ] Update src/routes/studentroutes.ts to use memory storage
- [ ] Update middleware/multer.ts if needed

## Controllers
- [ ] Update src/controllers/imageController.ts to use ImageKit upload API
- [ ] Update src/controllers/studentController.ts to use ImageKit for profile uploads

## Cleanup
- [ ] Remove src/config/cloudinary.ts
- [ ] Remove local uploads folder if unused
- [ ] Test TypeScript compilation
- [ ] Test image upload functionality
