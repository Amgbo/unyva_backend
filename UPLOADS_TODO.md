# Uploads TODO Checklist

This file lists every backend location that handles file uploads and what needs to be done so the backend supports both local storage (development) and ImageKit (production / when keys present).

Files and responsibilities

- `src/controllers/studentController.ts`
  - Handles: `profile_picture`, `id_card` during registration and profile update; deletion during account deletion.
  - Needs: conditional handling — save to ImageKit when enabled; otherwise save to `uploads/profiles/` and `uploads/idcards/`. Delete from ImageKit or local disk accordingly.

- `src/controllers/imageController.ts`
  - Handles: product images upload, multiple uploads, deletion and info lookup.
  - Needs: conditional handling — ImageKit (memory buffer uploads) vs local disk saving to `uploads/products/`. Return `url` field with `/uploads/products/{filename}` for local.

- `src/controllers/announcementController.ts`
  - Handles: announcement image upload and deletion reference.
  - Needs: conditional handling — ImageKit vs `uploads/announcements/`. Keep existing DB fields and return ImageKit URL or local `/uploads/announcements/...`.

- `src/routes/studentroutes.ts`
  - Configure multer to store to different folders depending on environment; support multi-field upload for profile + id_card.

- `src/routes/imageRoutes.ts`
  - Configure multer to use `products` folder locally or memoryStorage for ImageKit.

- `src/routes/announcementRoutes.ts`
  - Configure multer to use `announcements` folder locally or memoryStorage for ImageKit.

- `src/config/imagekit.ts`
  - Already exports a default ImageKit client or `null` and `shouldUseImageKit()` — keep as the single source of truth.

- `src/config/multer.ts` (new)
  - Export a factory `createMulter(fieldsMap?, defaultFolder?)` which returns a multer instance configured for either `memoryStorage` (ImageKit) or `diskStorage` (local), file size/type limits, and helper functions:
    - `getLocalUrl(folder, filename)`
    - `deleteLocalFile(folder, filename)`

Notes / Acceptance criteria

- Local uploads must be saved under `uploads/` with subfolders: `profiles`, `idcards`, `announcements`, `products`.
- Filenames format: `{timestamp}-{originalname}` (spaces replaced with `_`).
- `src/index.ts` already serves `/uploads` statically. Confirmed.
- Controllers must return `url` field pointing to `/uploads/...` for local uploads; ImageKit responses unchanged.

Bonus / optional

- Enforce allowed types: JPEG, PNG, WebP and max size 5MB in multer fileFilter and as runtime validation fallback in controllers.
