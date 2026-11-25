// src/controllers/serviceMessageController.ts
// In-app chat between a customer and a service provider about one service.
import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import {
  createServiceMessage,
  getServiceInbox,
  getServiceMessageContext,
  getServiceThreadMessages,
  getServiceThreadParticipant,
  markServiceThreadRead,
  serviceThreadExists,
} from '../models/serviceMessageModel.js';
import { notificationService } from '../services/notificationService.js';

const MAX_MESSAGE_LENGTH = 2000;
// New conversations can only be started on listed services.
const OPEN_SERVICE_STATUSES = ['available', 'reserved'];

function parseServiceId(raw: unknown): number | null {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Work out which conversation the caller is in.
 * - Customers are always in their own conversation (customer_id = themselves).
 * - The provider must say which customer's conversation they mean.
 */
function resolveCustomerId(
  userId: string,
  providerId: string,
  requestedCustomerId: unknown
): { customerId: string } | { status: number; error: string } {
  if (userId === providerId) {
    const customerId = requestedCustomerId != null ? String(requestedCustomerId).trim() : '';
    if (!customerId) return { status: 400, error: 'customer_id is required for the service provider' };
    if (customerId === providerId) return { status: 400, error: 'You cannot message yourself' };
    return { customerId };
  }

  if (requestedCustomerId != null && String(requestedCustomerId) !== userId) {
    return { status: 403, error: 'You can only view your own conversations' };
  }
  return { customerId: userId };
}

// POST /api/messages/service  { service_id, message, customer_id? }
export const sendServiceMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id ? String(req.user.id) : '';
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const body = req.body ?? {};
    const serviceId = parseServiceId(body.service_id);
    const text = typeof body.message === 'string' ? body.message.trim() : '';

    if (!serviceId || !text) {
      res.status(400).json({ success: false, error: 'Service ID and non-empty message are required' });
      return;
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ success: false, error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
      return;
    }

    const service = await getServiceMessageContext(serviceId);
    if (!service) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }
    const providerId = String(service.provider_id);

    const resolved = resolveCustomerId(userId, providerId, body.customer_id);
    if ('status' in resolved) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const { customerId } = resolved;

    const isProvider = userId === providerId;
    const threadExists = await serviceThreadExists(serviceId, customerId);

    if (isProvider && !threadExists) {
      // Providers reply; they can't open conversations with arbitrary students.
      res.status(404).json({ success: false, error: 'This customer has not messaged you about this service' });
      return;
    }
    if (!isProvider && !threadExists && !OPEN_SERVICE_STATUSES.includes(String(service.status))) {
      res.status(409).json({ success: false, error: 'This service is not currently accepting messages' });
      return;
    }

    const receiverId = isProvider ? customerId : providerId;
    const newMessage = await createServiceMessage({
      service_id: serviceId,
      customer_id: customerId,
      sender_id: userId,
      receiver_id: receiverId,
      message: text,
    });

    // Notify the other side; never fail the send because of a notification.
    try {
      const sender = await getServiceThreadParticipant(userId);
      const senderName = `${sender?.first_name ?? ''} ${sender?.last_name ?? ''}`.trim() || 'Someone';
      await notificationService.createAndSend({
        user_id: receiverId,
        type: 'message',
        title: isProvider ? 'Service Provider Reply' : 'New Service Inquiry',
        message: isProvider
          ? `${senderName} replied about "${service.title}"`
          : `${senderName} sent you a message about "${service.title}"`,
        data: {
          type: 'message',
          thread_type: 'service',
          service_id: serviceId,
          customer_id: customerId,
          sender_id: userId,
          message_id: newMessage.id,
          service_title: service.title,
        },
        priority: 'medium',
        delivery_methods: ['push'],
      });
    } catch (notificationError) {
      console.error('❌ Error sending service message notification:', notificationError);
    }

    res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
  } catch (error) {
    console.error('❌ Error sending service message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

// GET /api/messages/service/:serviceId?customerId=...
export const getServiceThread = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id ? String(req.user.id) : '';
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const serviceId = parseServiceId(req.params.serviceId);
    if (!serviceId) {
      res.status(400).json({ success: false, error: 'Invalid service ID' });
      return;
    }

    const service = await getServiceMessageContext(serviceId);
    if (!service) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }
    const providerId = String(service.provider_id);

    const resolved = resolveCustomerId(userId, providerId, req.query.customerId);
    if ('status' in resolved) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }
    const { customerId } = resolved;

    await markServiceThreadRead(serviceId, customerId, userId);

    const otherUserId = userId === providerId ? customerId : providerId;
    const [messages, otherUser] = await Promise.all([
      getServiceThreadMessages(serviceId, customerId),
      getServiceThreadParticipant(otherUserId),
    ]);

    const { provider_id: _providerId, ...serviceSummary } = service;

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
      service: serviceSummary,
      customer_id: customerId,
      is_provider: userId === providerId,
      other_user: otherUser,
    });
  } catch (error) {
    console.error('❌ Error fetching service messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

// POST /api/messages/service/:serviceId/read  { customer_id? }
export const markServiceThreadReadController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id ? String(req.user.id) : '';
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const serviceId = parseServiceId(req.params.serviceId);
    if (!serviceId) {
      res.status(400).json({ success: false, error: 'Invalid service ID' });
      return;
    }

    const service = await getServiceMessageContext(serviceId);
    if (!service) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }

    const resolved = resolveCustomerId(userId, String(service.provider_id), req.body?.customer_id ?? req.query.customerId);
    if ('status' in resolved) {
      res.status(resolved.status).json({ success: false, error: resolved.error });
      return;
    }

    // Only marks messages addressed to the caller, so it is safe for any thread.
    await markServiceThreadRead(serviceId, resolved.customerId, userId);
    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('❌ Error marking service messages as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
};

// GET /api/messages/service-inbox
export const getServiceInboxController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id ? String(req.user.id) : '';
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const inbox = await getServiceInbox(userId);
    res.status(200).json({ success: true, count: inbox.length, inbox });
  } catch (error) {
    console.error('❌ Error fetching service inbox:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inbox' });
  }
};
