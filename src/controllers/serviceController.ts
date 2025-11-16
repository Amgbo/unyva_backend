import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import {
  getServiceById,
  getServicesByStudent,
  getRelatedServices,
  getServiceReviews,
  createService,
  updateService,
  deleteService,
  searchServices,
  getProviderStats,
  createBooking,
  getBookingById,
  getProviderBookings,
  getProviderServicesGrouped,
  getBuyerBookings,
  updateBookingStatus,
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  createReview,
  deleteServiceReview,
  canUserReviewService,
  canUserReplyToServiceComment,
  getUserReviewForService,
  updateProviderRating,
  getFeaturedServices,
  ServiceWithProvider,
  ServiceReview,
  CreateServiceData,
  UpdateServiceData,
  ServiceBooking,
  ServiceNotification
} from '../models/serviceModel.js';
import { ReviewModel } from '../models/reviewModel.js';

// GET: Single service by ID
export const getService = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceId = parseInt(id, 10);

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    const service = await getServiceById(serviceId);

    if (!service) {
      res.status(404).json({
        success: false,
        error: 'Service not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    console.error('❌ Error fetching service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Services by student ID (My Services)
export const getMyServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    // Return grouped services: available (includes reserved), pending bookings, and booked/completed bookings (one row per booking)
    const grouped = await getProviderServicesGrouped(studentId);

    res.status(200).json({
      success: true,
      counts: {
        available: grouped.available.length,
        pending: grouped.pending.length,
        booked: grouped.booked.length
      },
      ...grouped
    });
  } catch (error) {
    console.error('❌ Error fetching user services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user services',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Search services with filters
export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      query,
      categories,
      minPrice,
      maxPrice,
      halls,
      rating,
      sortBy = 'created_at',
      limit = 20,
      offset = 0
    } = req.query;

    const limitNum = parseInt(String(limit));
    const offsetNum = parseInt(String(offset));

    const filters: any = {
      limit: limitNum,
      offset: offsetNum,
      sortBy: sortBy as 'created_at' | 'price' | 'rating' | 'view_count'
    };

    if (query) filters.query = String(query);
    if (categories) filters.categories = String(categories).split(',');
    if (minPrice) filters.minPrice = parseFloat(String(minPrice));
    if (maxPrice) filters.maxPrice = parseFloat(String(maxPrice));
    if (halls) filters.halls = String(halls).split(',').map(Number);
    if (rating) filters.rating = parseFloat(String(rating));

    const result = await searchServices(filters);

    res.json({
      success: true,
      data: result.services,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: offsetNum + limitNum < result.total
      }
    });
  } catch (error) {
    console.error('❌ Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services'
    });
  }
};

// POST: Create new service
export const createNewService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const serviceData: CreateServiceData = {
      student_id: studentId,
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      contact_method: req.body.contact_method,
      hall_id: req.body.hall_id ? parseInt(req.body.hall_id, 10) : undefined,
      room_number: req.body.room_number,
      price_negotiable: req.body.price_negotiable || false,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : [],
      availability_schedule: req.body.availability_schedule,
      image_urls: req.body.image_urls ? (Array.isArray(req.body.image_urls) ? req.body.image_urls : [req.body.image_urls]) : []
    };

    // Validate required fields
    if (!serviceData.title || !serviceData.price || !serviceData.description ||
        !serviceData.category || !serviceData.contact_method) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['title', 'price', 'description', 'category', 'contact_method']
      });
      return;
    }

    // Validate price
    if (serviceData.price <= 0 || serviceData.price > 10000) {
      res.status(400).json({
        success: false,
        error: 'Price must be between 0.01 and 10000'
      });
      return;
    }

    const service = await createService(serviceData);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('❌ Error creating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// PUT: Update service
export const updateExistingService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceId = parseInt(id, 10);
    const studentId = req.user?.student_id;

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const updateData: UpdateServiceData = {
      id: serviceId,
      title: req.body.title,
      price: req.body.price ? parseFloat(req.body.price) : undefined,
      description: req.body.description,
      category: req.body.category,
      contact_method: req.body.contact_method,
      hall_id: req.body.hall_id ? parseInt(req.body.hall_id, 10) : undefined,
      room_number: req.body.room_number,
      status: req.body.status,
      price_negotiable: req.body.price_negotiable,
      tags: req.body.tags,
      availability_schedule: req.body.availability_schedule,
      image_urls: req.body.image_urls
    };

    const updatedService = await updateService(serviceId, updateData);

    if (!updatedService) {
      res.status(404).json({
        success: false,
        error: 'Service not found or you do not have permission to update it'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      service: updatedService
    });
  } catch (error) {
    console.error('❌ Error updating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// DELETE: Delete service
export const deleteExistingService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceId = parseInt(id, 10);
    const studentId = req.user?.student_id;

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No student ID found in token'
      });
      return;
    }

    const deleted = await deleteService(serviceId, studentId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Service not found or you do not have permission to delete it'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Service reviews
export const getServiceReviewsController = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceId = parseInt(id, 10);
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    const { reviews, total, hasMore } = await getServiceReviews(serviceId, page, limit);

    res.status(200).json({
      success: true,
      reviews,
      total,
      hasMore,
      page,
      limit
    });
  } catch (error) {
    console.error('❌ Error fetching service reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service reviews',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Related services
export const getRelatedServicesController = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const serviceId = parseInt(id, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    // Get the service first to get category and hall_id
    const service = await getServiceById(serviceId);
    if (!service) {
      res.status(404).json({
        success: false,
        error: 'Service not found'
      });
      return;
    }

    const relatedServices = await getRelatedServices(serviceId, service.category, service.hall_id, limit);

    res.status(200).json({
      success: true,
      count: relatedServices.length,
      services: relatedServices
    });
  } catch (error) {
    console.error('❌ Error fetching related services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch related services',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Provider statistics
export const getProviderStatsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const stats = await getProviderStats(studentId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching provider stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

// POST: Create service booking
export const createBookingController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const { service_id, description, budget, booking_date, booking_time, duration, notes } = req.body;

    // Validate required fields for simplified booking
    if (!service_id || !description || !budget) {
      res.status(400).json({
        success: false,
        error: 'Service ID, description, and budget are required'
      });
      return;
    }

    // Get service details to get provider_id and price
    const service = await getServiceById(service_id);
    if (!service) {
      res.status(404).json({
        success: false,
        error: 'Service not found'
      });
      return;
    }

    // Prevent booking own service
    if (service.student_id === studentId) {
      res.status(403).json({
        success: false,
        error: 'You cannot book your own service'
      });
      return;
    }

    // Use provided budget or service price as fallback
    const bookingPrice = parseFloat(budget) || service.price;

    const bookingData: Omit<ServiceBooking, 'id' | 'created_at' | 'updated_at'> = {
      service_id: parseInt(service_id),
      customer_id: studentId,
      provider_id: service.student_id,
      booking_date: booking_date || null,
      booking_time: booking_time || null,
      duration: duration ? parseInt(duration) : null,
      status: 'pending',
      price: bookingPrice,
      notes: description // Use description as notes
    };

    const booking = await createBooking(bookingData);

    // Create notification for provider
    await createNotification({
      student_id: service.student_id,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `You have a new booking request for "${service.title}": ${description}`,
      data: { booking_id: booking.id, service_id },
      is_read: false
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking request sent successfully'
    });
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    });
  }
};

// GET: Provider bookings
export const getProviderBookingsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const bookings = await getProviderBookings(studentId);

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
};

// GET: Buyer bookings
export const getBuyerBookingsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const bookings = await getBuyerBookings(studentId);

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('❌ Error fetching buyer bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buyer bookings'
    });
  }
};

// PUT: Update booking status
export const updateBookingStatusController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { booking_id } = req.params;
    const { status } = req.body;

    const booking = await updateBookingStatus(parseInt(booking_id), status);

    if (!booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
      return;
    }

    // Create notification for customer
    await createNotification({
      student_id: booking.customer_id,
      type: status === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
      title: status === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
      message: `Your booking for service has been ${status}`,
      data: { booking_id: booking.id },
      is_read: false
    });

    res.json({
      success: true,
      data: booking,
      message: `Booking ${status} successfully`
    });
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking'
    });
  }
};

// GET: User notifications
export const getNotificationsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const notifications = await getUserNotifications(studentId);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// PUT: Mark notification as read
export const markNotificationReadController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notification_id } = req.params;
    const notification = await markNotificationAsRead(parseInt(notification_id));

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification'
    });
  }
};

// POST: Create service review (enhanced with nested comments)
export const createReviewController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    let { service_id, booking_id, rating, title, comment, parent_id } = req.body;

    // If service_id not in body, check params (for /:id/reviews route)
    if (!service_id && req.params.id) {
      service_id = req.params.id;
    }

    // Validate service_id
    const serviceIdNum = parseInt(service_id);
    if (isNaN(serviceIdNum) || serviceIdNum <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID: must be a positive number'
      });
      return;
    }

    // Get service to determine the provider_id
    let service;
    try {
      service = await getServiceById(serviceIdNum);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID format'
      });
      return;
    }

    if (!service) {
      res.status(404).json({
        success: false,
        error: 'Service not found'
      });
      return;
    }

    // Prevent reviewing own service for top-level reviews only
    // Allow service providers to reply to reviews on their services
    if (!parent_id && service.student_id === studentId) {
      res.status(403).json({
        success: false,
        error: 'You cannot review your own service'
      });
      return;
    }

    // If this is a reply, validate permissions (all authenticated users can reply)
    if (parent_id) {
      const canReply = await canUserReplyToServiceComment(studentId, parent_id);
      if (!canReply) {
        res.status(403).json({
          success: false,
          error: 'You cannot reply to this comment'
        });
        return;
      }
    }

    // Prepare validated booking_id for review data
    // Temporarily disable booking validation to prevent database errors
    let validatedBookingId: number | undefined = undefined;
    // TODO: Re-enable booking validation once frontend sends valid booking_id values
    console.log('🔍 Booking validation disabled - review will be created without booking link');

    const reviewData: Omit<ServiceReview, 'id' | 'created_at'> & { parent_id?: number | null } = {
      service_id: serviceIdNum,
      booking_id: validatedBookingId,
      customer_id: studentId,
      provider_id: service.student_id,
      rating: parent_id ? 0 : parseInt(rating),
      title: parent_id ? 'Reply' : title,
      comment,
      is_verified: !!validatedBookingId, // Verified if from a booking
      parent_id: parent_id || null
    };

    const review = await createReview(reviewData);

    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    });
  }
};

// DELETE: Delete service review (enhanced with cascade deletion)
export const deleteServiceReviewController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { reviewId } = req.params;
    const reviewIdNum = parseInt(reviewId, 10);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (isNaN(reviewIdNum)) {
      res.status(400).json({
        success: false,
        error: 'Invalid review ID'
      });
      return;
    }

    // Delete the review (enhanced function handles ownership check and cascade)
    const deletedCount = await deleteServiceReview(reviewIdNum, studentId);

    if (deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Review not found or you do not have permission to delete it'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Review and ${deletedCount - 1} nested replies deleted successfully`
    });
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Check if user can review a service
export const canUserReviewServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const serviceId = parseInt(id, 10);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    const canReview = await canUserReviewService(studentId, serviceId);

    res.status(200).json({
      success: true,
      canReview
    });
  } catch (error) {
    console.error('❌ Error checking review permission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check review permission',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Get user's review for a service
export const getUserReviewForServiceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    const { id } = req.params;
    const serviceId = parseInt(id, 10);

    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (isNaN(serviceId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
      return;
    }

    const review = await getUserReviewForService(studentId, serviceId);

    res.status(200).json({
      success: true,
      review
    });
  } catch (error) {
    console.error('❌ Error fetching user review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET: Featured services
export const getFeaturedServicesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const excludeStudentId = req.query.excludeStudentId as string;

    const services = await getFeaturedServices(limit, excludeStudentId);

    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('❌ Error fetching featured services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured services'
    });
  }
};
