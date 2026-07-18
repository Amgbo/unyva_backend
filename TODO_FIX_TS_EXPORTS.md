# TODO_FIX_TS_EXPORTS.md

## Goal
Fix remaining TypeScript build errors caused by routes importing controller symbols that no longer exist (renamed exports).

## Steps
- [ ] Update dealRoutes.ts to use exported functions from dealController.ts
- [ ] Update deliveryRoutes.ts to use exported functions from deliveryController.ts
- [ ] Update imageRoutes.ts to use exported functions from imageController.ts
- [ ] Update messageRoutes.ts to use exported functions from messageController.ts
- [ ] Update orderRoutes.ts to use exported functions from orderController.ts
- [ ] Update productRoutes.ts to use exported functions from productController.ts and reviewController.ts
- [ ] Update reviewRoutes.ts to use exported functions from reviewController.ts
- [ ] Update serviceRoutes.ts to use exported functions from serviceController.ts
- [ ] Update studentroutes.ts to use exported functions from studentController.ts (remove non-existing exports)

## Validation
- [ ] Run `npm run build` in `unyva_backend` and confirm TypeScript passes.

