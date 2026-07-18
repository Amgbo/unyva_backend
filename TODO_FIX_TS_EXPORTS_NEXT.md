# TODO_FIX_TS_EXPORTS_NEXT

- [ ] deliveryController.ts: add backward-compatible exports expected by src/routes/deliveryRoutes.ts
  - getDeliveryStats -> likely missing in current file
  - getDeliveries -> likely missing
  - getPendingDeliveries -> likely missing
  - requireDeliveryRole -> likely missing
  - keep existing new exports (do NOT remove): verifyDeliveryCode, registerDeliveryUser, getDeliveryProfile, updateDeliveryProfile, getAvailableDeliveries, acceptDelivery, completeDelivery, getMyDeliveries

- [ ] imageController.ts: add backward-compatible exports expected by src/routes/imageRoutes.ts
  - uploadProductImage -> alias to uploadImage
  - uploadMultipleProductImages -> alias to uploadMultipleImages
  - deleteProductImage -> alias to deleteImage
  - getImageInfo -> implement alias/stub to existing functionality (no getImageInfo currently in file)

- [ ] messageController.ts: add backward-compatible exports expected by src/routes/messageRoutes.ts
  - sendProductMessage -> alias to sendMessage
  - getProductMessages -> alias to getMessages
  - getSellerInboxController -> stub/alias (no inbox controller currently)
  - markMessagesAsReadController -> alias to getUnreadCount? (needs real match; likely stub)

- [ ] orderController.ts: add backward-compatible exports expected by src/routes/orderRoutes.ts
  - getOrders -> alias to getMyOrders
  - confirmOrderComplete -> stub/alias to existing cancel/others (needs match; locate existing function)

- [ ] productController.ts: add backward-compatible exports expected by src/routes/productRoutes.ts
  - getAllAvailableProducts -> alias to getProducts
  - getProduct -> alias to getProductById
  - createNewProduct -> alias to createProduct
  - updateExistingProduct -> alias to updateProduct
  - archiveExistingProduct -> alias to deleteProduct (or implement archive)
  - confirmDelivered -> stub/alias to updateProduct (if status change)
  - searchAndFilterProducts -> alias to getProducts
  - getFeaturedProductsController, getProductsByCategoryController, getProductSuggestionsController, getSearchFiltersController, getPopularSearchesController, getRelatedProductsController -> implement aliases/stubs to existing DB queries OR keep as TODO (must compile)

- [ ] reviewController.ts: add backward-compatible exports expected by src/routes/reviewRoutes.ts and productRoutes.ts
  - getProductReviews -> alias to getSellerReviews (or implement)
  - updateReview -> stub/alias (not present)
  - deleteReview -> stub/alias (not present)
  - canUserReviewProduct -> stub/alias (not present)
  - getUserReviewForProduct -> stub/alias (not present)
  - keep existing createReview, getSellerReviews, getMyReviews

- [ ] serviceController.ts: add backward-compatible exports expected by src/routes/serviceRoutes.ts
  - getService -> alias to getServices
  - createNewService -> alias to createService
  - updateExistingService -> alias to updateService
  - deleteExistingService -> alias to deleteService
  - getServiceReviewsController -> stub (not present)
  - getProviderStatsController -> stub (not present)
  - createBookingController, getProviderBookingsController, getBuyerBookingsController, updateBookingStatusController -> stub (not present)
  - getNotificationsController, markNotificationReadController -> stub (not present)
  - createReviewController, deleteServiceReviewController, canUserReviewServiceController, getUserReviewForServiceController, getFeaturedServicesController -> stub (not present)

- [ ] studentController.ts: add backward-compatible exports expected by src/routes/studentroutes.ts
  - registerStep1, completeRegistration, verifyEmail -> stub/alias (not present)
  - getStudentProfile -> alias to getProfile
  - getStudentProfileById -> stub (not present)
  - updateStudentProfile -> alias to updateProfile
  - deleteAccount -> stub (not present)

- [ ] After aliases/stubs: run TypeScript build again and iterate until 0 TS2305/TS2724 errors

