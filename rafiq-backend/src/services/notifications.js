/**
 * RAFIQ Backend Notification Service
 * Real-time notifications, websocket events, Supabase sync
 */

import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../sync/supabase.js';
import { publishAlert, getMqttClient } from '../smarthome/mqtt.js';
import { broadcastAlert } from '../sockets/sse.js';

// ─── Notification Types ───────────────────────────────────────

export type NotificationCategory =
  | 'emergency'
  | 'health'
  | 'medication'
  | 'device'
  | 'chat'
  | 'system'
  | 'food'
  | 'wearable';

export interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  type: string;
  category: NotificationCategory;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, unknown>;
  screen?: string;
  source?: 'local' | 'backend' | 'wearable' | 'ai' | 'system';
}

// ─── Notification Service ─────────────────────────────────────

export class NotificationService {
  constructor() {}

  /**
   * Create notification in Supabase and broadcast to all connected clients
   */
  async createNotification(payload: NotificationPayload): Promise<string> {
    const { user_id, title, body, type, category, severity = 'medium', data, screen, source = 'backend' } = payload;

    // Insert into Supabase
    const { data: inserted, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        title,
        body,
        type,
        category,
        severity,
        data: data ?? null,
        screen: screen ?? 'NotificationCenter',
        source,
        is_read: false,
        is_pinned: severity === 'critical',
      })
      .select()
      .single();

    if (error) {
      console.error('[NotificationService] Supabase insert failed:', error);
      throw error;
    }

    // Broadcast via SSE to connected clients
    const alert = {
      type: 'notification',
      data: inserted,
      timestamp: new Date().toISOString(),
    };
    broadcastAlert(alert);

    // Publish to MQTT for Mini-PC integration
    if (category === 'emergency' || severity === 'critical') {
      try {
        const mqttClient = getMqttClient();
        if (mqttClient) {
          mqttClient.publish(`rafiq/alerts/${user_id}`, JSON.stringify({
            ...inserted,
            alertType: category,
            priority: severity,
          }));
        }
      } catch (mqttErr) {
        console.warn('[NotificationService] MQTT publish failed:', mqttErr);
      }
    }

    return inserted.id;
  }

  /**
   * Emergency notification - broadcast to all channels
   */
  async sendEmergency(params: {
    userId: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, unknown>;
    location?: { lat: number; lng: number };
  }): Promise<string> {
    const id = await this.createNotification({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      category: 'emergency',
      severity: 'critical',
      data: params.data,
      screen: 'Emergency',
      source: 'system',
    });

    // Emit websocket event for immediate delivery
    const wsEvent = {
      type: 'emergency_alert',
      data: {
        id,
        title: params.title,
        body: params.body,
        location: params.location,
        timestamp: new Date().toISOString(),
      },
    };
    broadcastAlert(wsEvent);

    return id;
  }

  /**
   * Health alert from wearable/device
   */
  async sendHealthAlert(params: {
    userId: string;
    title: string;
    body: string;
    severity?: 'low' | 'medium' | 'high';
    vitalType?: string;
    value?: string;
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: 'health_alert',
      category: 'health',
      severity: params.severity ?? 'medium',
      data: { vitalType: params.vitalType, value: params.value },
      screen: 'Vitals',
      source: 'wearable',
    });
  }

  /**
   * Medication reminder
   */
  async sendMedicationReminder(params: {
    userId: string;
    title: string;
    body: string;
    medicationId?: string;
    scheduledTime?: string;
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: 'medication_reminder',
      category: 'medication',
      severity: 'medium',
      data: { medicationId: params.medicationId, scheduledTime: params.scheduledTime },
      screen: 'Medications',
      source: 'system',
    });
  }

  /**
   * Gas detection alert
   */
  async sendGasAlert(params: {
    userId: string;
    level: 'safe' | 'warning' | 'danger' | 'critical';
    concentration?: number;
    location?: string;
  }): Promise<string> {
    const titles = {
      safe: 'Gas Sensor Active',
      warning: 'Gas Level Warning',
      danger: 'Gas Leak Detected!',
      critical: 'CRITICAL: Gas Emergency!',
    };
    const bodies = {
      safe: 'Gas levels are normal',
      warning: `Gas concentration elevated: ${params.concentration} PPM`,
      danger: `Potential gas leak detected at ${params.location || 'home'}. Please check immediately.`,
      critical: `DANGER: High gas levels detected at ${params.location || 'home'}. Evacuate immediately and call emergency services!`,
    };

    return this.createNotification({
      user_id: params.userId,
      title: titles[params.level],
      body: bodies[params.level],
      type: 'gas_alert',
      category: 'device',
      severity: params.level === 'critical' ? 'critical' : params.level === 'danger' ? 'high' : 'medium',
      data: { level: params.level, concentration: params.concentration, location: params.location },
      screen: 'Home',
      source: 'system',
    });
  }

  /**
   * Fall detection alert
   */
  async sendFallAlert(params: {
    userId: string;
    confidence?: number;
    location?: string;
    timestamp?: string;
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: 'Fall Detected!',
      body: `A fall was detected${params.location ? ` at ${params.location}` : ''}. Emergency response may be needed.`,
      type: 'fall_detection',
      category: 'emergency',
      severity: 'critical',
      data: { confidence: params.confidence, location: params.location, timestamp: params.timestamp },
      screen: 'Emergency',
      source: 'wearable',
    });
  }

  /**
   * AI health warning
   */
  async sendAIWarning(params: {
    userId: string;
    title: string;
    body: string;
    insightType?: string;
    recommendations?: string[];
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: 'ai_warning',
      category: 'health',
      severity: 'medium',
      data: { insightType: params.insightType, recommendations: params.recommendations },
      screen: 'Chat',
      source: 'ai',
    });
  }

  /**
   * Wearable disconnect alert
   */
  async sendWearableDisconnect(params: {
    userId: string;
    deviceName?: string;
    deviceId?: string;
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: params.deviceName ? `Wearable Disconnected: ${params.deviceName}` : 'Wearable Disconnected',
      body: 'Smartwatch connection lost. Please check the device and reconnect.',
      type: 'wearable_disconnect',
      category: 'wearable',
      severity: 'medium',
      data: { deviceName: params.deviceName, deviceId: params.deviceId },
      screen: 'Vitals',
      source: 'system',
    });
  }

  /**
   * Device offline alert
   */
  async sendDeviceOffline(params: {
    userId: string;
    deviceName: string;
    deviceType?: string;
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: `Device Offline: ${params.deviceName}`,
      body: `${params.deviceType || 'Device'} is not responding. Please check the connection.`,
      type: 'device_offline',
      category: 'device',
      severity: 'medium',
      data: { deviceName: params.deviceName, deviceType: params.deviceType },
      screen: 'Home',
      source: 'system',
    });
  }

  /**
   * Chat message notification
   */
  async sendChatMessage(params: {
    userId: string;
    senderName: string;
    message: string;
    conversationId?: string;
  }): Promise<string> {
    return this.createNotification({
      user_id: params.userId,
      title: `Message from ${params.senderName}`,
      body: params.message.substring(0, 100),
      type: 'chat_message',
      category: 'chat',
      severity: 'low',
      data: { conversationId: params.conversationId, senderName: params.senderName },
      screen: 'Chat',
      source: 'system',
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count ?? 0;
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// ─── Notification Routes ────────────────────────────────────

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  // Create notification
  app.post('/notifications', async (request, reply) => {
    try {
      const body = request.body as NotificationPayload;
      const id = await notificationService.createNotification(body);
      return reply.send({ success: true, id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get notifications
  app.get('/notifications/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const limit = Number(request.query['limit']) || 50;
      const notifications = await notificationService.getNotifications(userId, limit);
      return reply.send({ success: true, notifications });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get unread count
  app.get('/notifications/:userId/unread', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const count = await notificationService.getUnreadCount(userId);
      return reply.send({ success: true, count });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Mark as read
  app.patch('/notifications/:id/read', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };
      await notificationService.markAsRead(id, userId);
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Mark all as read
  app.post('/notifications/:userId/read-all', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      await notificationService.markAllAsRead(userId);
      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Emergency alert
  app.post('/alerts/emergency', async (request, reply) => {
    try {
      const body = request.body as {
        userId: string;
        title: string;
        body: string;
        type: string;
        location?: { lat: number; lng: number };
      };
      const id = await notificationService.sendEmergency(body);
      return reply.send({ success: true, id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Health alert
  app.post('/alerts/health', async (request, reply) => {
    try {
      const body = request.body as {
        userId: string;
        title: string;
        body: string;
        severity?: 'low' | 'medium' | 'high';
        vitalType?: string;
        value?: string;
      };
      const id = await notificationService.sendHealthAlert(body);
      return reply.send({ success: true, id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Gas alert
  app.post('/alerts/gas', async (request, reply) => {
    try {
      const body = request.body as {
        userId: string;
        level: 'safe' | 'warning' | 'danger' | 'critical';
        concentration?: number;
        location?: string;
      };
      const id = await notificationService.sendGasAlert(body);
      return reply.send({ success: true, id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // Fall alert
  app.post('/alerts/fall', async (request, reply) => {
    try {
      const body = request.body as {
        userId: string;
        confidence?: number;
        location?: string;
      };
      const id = await notificationService.sendFallAlert(body);
      return reply.send({ success: true, id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}