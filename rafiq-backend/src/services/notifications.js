/**
 * RAFIQ Backend Notification Service
 * Local-first notifications with SSE/MQTT delivery and Supabase queueing.
 */

import { getDb } from '../db/index.js';
import { createUuid, enqueueSync, isoNow, json } from '../db/utils.js';
import { getMqttClient } from '../smarthome/mqtt.js';
import { broadcastAlert } from '../sockets/sse.js';

const VALID_CATEGORIES = new Set([
  'emergency',
  'health',
  'medication',
  'device',
  'chat',
  'system',
  'food',
  'wearable',
]);

export class NotificationService {
  createNotification(payload) {
    const db = getDb();
    const id = payload.id ?? createUuid();
    const severity = payload.severity ?? 'medium';
    const category = VALID_CATEGORIES.has(payload.category) ? payload.category : 'system';

    db.prepare(
      `INSERT INTO notifications
        (id, user_id, patient_id, title, body, type, category, severity, is_read, is_pinned,
         data, screen, source, idempotency_key, delivered_at)
       VALUES
        (@id, @user_id, @patient_id, @title, @body, @type, @category, @severity, 0, @is_pinned,
         @data, @screen, @source, @idempotency_key, @delivered_at)
       ON CONFLICT(user_id, idempotency_key) DO UPDATE SET
        title = excluded.title,
        body = excluded.body,
        severity = excluded.severity,
        data = excluded.data,
        updated_at = datetime('now')`
    ).run({
      id,
      user_id: payload.user_id,
      patient_id: payload.patient_id ?? null,
      title: payload.title,
      body: payload.body,
      type: payload.type ?? category,
      category,
      severity,
      is_pinned: severity === 'critical' ? 1 : 0,
      data: json(payload.data),
      screen: payload.screen ?? 'NotificationCenter',
      source: payload.source ?? 'backend',
      idempotency_key: payload.idempotency_key ?? `${payload.user_id}:${payload.type ?? category}:${payload.title}`,
      delivered_at: isoNow(),
    });

    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id)
      ?? db.prepare('SELECT * FROM notifications WHERE user_id = ? AND idempotency_key = ?').get(
        payload.user_id,
        payload.idempotency_key ?? `${payload.user_id}:${payload.type ?? category}:${payload.title}`,
      );

    enqueueSync(db, 'notifications', 'upsert', row.id, row, {
      user_id: row.user_id,
      priority: severity === 'critical' ? 'critical' : 'normal',
    });

    broadcastAlert({ type: 'notification', data: row, timestamp: isoNow() });

    if (category === 'emergency' || severity === 'critical') {
      try {
        getMqttClient()?.publish(`rafiq/alerts/${payload.user_id}`, JSON.stringify({
          ...row,
          alertType: category,
          priority: severity,
        }));
      } catch (err) {
        console.warn('[NotificationService] MQTT publish failed:', err.message);
      }
    }

    return row.id;
  }

  sendEmergency(params) {
    const id = this.createNotification({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      type: params.type,
      category: 'emergency',
      severity: 'critical',
      data: { ...(params.data ?? {}), location: params.location },
      screen: 'Emergency',
      source: 'system',
    });
    broadcastAlert({
      type: 'emergency_alert',
      data: { id, title: params.title, body: params.body, location: params.location, timestamp: isoNow() },
    });
    return id;
  }

  sendHealthAlert(params) {
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

  sendMedicationReminder(params) {
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

  sendGasAlert(params) {
    const titles = {
      safe: 'Gas Sensor Active',
      warning: 'Gas Level Warning',
      danger: 'Gas Leak Detected',
      critical: 'Critical Gas Emergency',
    };
    const bodies = {
      safe: 'Gas levels are normal',
      warning: `Gas concentration elevated: ${params.concentration ?? 'unknown'} PPM`,
      danger: `Potential gas leak detected at ${params.location || 'home'}. Please check immediately.`,
      critical: `High gas levels detected at ${params.location || 'home'}. Evacuate immediately and call emergency services.`,
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

  sendFallAlert(params) {
    return this.createNotification({
      user_id: params.userId,
      title: 'Fall Detected',
      body: `A fall was detected${params.location ? ` at ${params.location}` : ''}. Emergency response may be needed.`,
      type: 'fall_detection',
      category: 'emergency',
      severity: 'critical',
      data: { confidence: params.confidence, location: params.location, timestamp: params.timestamp },
      screen: 'Emergency',
      source: 'wearable',
    });
  }

  sendAIWarning(params) {
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

  sendWearableDisconnect(params) {
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

  sendDeviceOffline(params) {
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

  sendChatMessage(params) {
    return this.createNotification({
      user_id: params.userId,
      title: `Message from ${params.senderName}`,
      body: String(params.message ?? '').substring(0, 100),
      type: 'chat_message',
      category: 'chat',
      severity: 'low',
      data: { conversationId: params.conversationId, senderName: params.senderName },
      screen: 'Chat',
      source: 'system',
    });
  }

  markAsRead(notificationId, userId) {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1, read_at = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(isoNow(), isoNow(), notificationId, userId);
    const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);
    if (row) enqueueSync(db, 'notifications', 'update', row.id, row, { user_id: row.user_id });
  }

  markAllAsRead(userId) {
    const db = getDb();
    const rows = db.prepare('SELECT id FROM notifications WHERE user_id = ? AND is_read = 0').all(userId);
    const mark = db.prepare('UPDATE notifications SET is_read = 1, read_at = ?, updated_at = ? WHERE id = ?');
    const tx = db.transaction(() => {
      for (const row of rows) mark.run(isoNow(), isoNow(), row.id);
    });
    tx();
    for (const row of rows) {
      const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(row.id);
      enqueueSync(db, 'notifications', 'update', row.id, notification, { user_id: userId });
    }
  }

  getNotifications(userId, limit = 50) {
    return getDb().prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit);
  }

  getUnreadCount(userId) {
    return getDb().prepare(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0'
    ).get(userId)?.count ?? 0;
  }
}

export const notificationService = new NotificationService();

export async function registerNotificationRoutes(app) {
  app.post('/notifications', async (request, reply) => {
    try {
      const id = notificationService.createNotification(request.body);
      return reply.send({ success: true, id });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.get('/notifications/:userId', async (request, reply) => {
    try {
      const limit = Number(request.query?.limit) || 50;
      return reply.send({ success: true, data: notificationService.getNotifications(request.params.userId, limit) });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.get('/notifications/:userId/unread', async (request, reply) => {
    try {
      return reply.send({ success: true, count: notificationService.getUnreadCount(request.params.userId) });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.patch('/notifications/:id/read', async (request, reply) => {
    try {
      notificationService.markAsRead(request.params.id, request.body.userId ?? request.body.user_id);
      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.post('/notifications/:userId/read-all', async (request, reply) => {
    try {
      notificationService.markAllAsRead(request.params.userId);
      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.post('/alerts/emergency', async (request, reply) => {
    try {
      return reply.send({ success: true, id: notificationService.sendEmergency(request.body) });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.post('/alerts/health', async (request, reply) => {
    try {
      return reply.send({ success: true, id: notificationService.sendHealthAlert(request.body) });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.post('/alerts/gas', async (request, reply) => {
    try {
      return reply.send({ success: true, id: notificationService.sendGasAlert(request.body) });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });

  app.post('/alerts/fall', async (request, reply) => {
    try {
      return reply.send({ success: true, id: notificationService.sendFallAlert(request.body) });
    } catch (error) {
      return reply.status(500).send({ success: false, error: { code: 'notification_error', message: error.message } });
    }
  });
}
