/**
 * sockets/sse.js - Server-Sent Events for real-time updates
 * Manages connected clients and broadcasts to Electron/Mobile
 */

const clients = new Set();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function getClientCount() {
  return clients.size;
}

/**
 * Broadcast to all connected SSE clients
 */
export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try {
      res.raw.write(payload);
    } catch (e) {
      // Client disconnected, remove from set
      clients.delete(res);
    }
  });
}

/**
 * Convenience: broadcast alert
 */
export function broadcastAlert(alert) {
  broadcast('alert', alert);
}

/**
 * Convenience: broadcast emergency
 */
export function broadcastEmergency(event) {
  broadcast('emergency', event);
}

/**
 * Convenience: broadcast device state change
 */
export function broadcastDeviceState(device) {
  broadcast('device', device);
}

/**
 * Set up SSE endpoint on Fastify
 */
export function registerSSE(app) {
  app.get('/events', (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection message
    reply.raw.write(':connected\n\n');

    addClient(reply);

    // Clean up on disconnect
    req.raw.on('close', () => {
      removeClient(reply);
    });

    // Keep-alive ping every 25 seconds
    const keepAlive = setInterval(() => {
      try {
        reply.raw.write(':ping\n\n');
      } catch (e) {
        clearInterval(keepAlive);
        removeClient(reply);
      }
    }, 25_000);

    req.raw.on('close', () => {
      clearInterval(keepAlive);
    });

    return reply;
  });
}