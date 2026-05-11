class SSEService {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.listeners = new Map();
    this.isConnecting = false;
    this.isManualDisconnect = false;
  }

  connect(url) {
    if (this.eventSource || this.isConnecting) {
      return;
    }

    const apiUrl = url || `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/events`;
    this.isConnecting = true;
    this.isManualDisconnect = false;

    try {
      this.eventSource = new EventSource(apiUrl);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.emit('connection', { status: 'connected' });
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (!this.isManualDisconnect) {
          this.emit('connection', { status: 'disconnected' });
          this.handleReconnect(apiUrl);
        }
      };

      // AI State events
      this.eventSource.addEventListener('ai_state', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('ai_state', data);
        } catch (err) {
          console.error('[SSE] Failed to parse ai_state:', err);
        }
      });

      // Speaking events
      this.eventSource.addEventListener('speaking', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('speaking', data);
        } catch (err) {
          console.error('[SSE] Failed to parse speaking:', err);
        }
      });

      // Emotion events
      this.eventSource.addEventListener('emotion', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('emotion', data);
        } catch (err) {
          console.error('[SSE] Failed to parse emotion:', err);
        }
      });

      // Emergency events
      this.eventSource.addEventListener('emergency', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('emergency', data);
        } catch (err) {
          console.error('[SSE] Failed to parse emergency:', err);
        }
      });

      // Alert events
      this.eventSource.addEventListener('alert', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('alert', data);
        } catch (err) {
          console.error('[SSE] Failed to parse alert:', err);
        }
      });

      // Device state events
      this.eventSource.addEventListener('device', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('device', data);
        } catch (err) {
          console.error('[SSE] Failed to parse device:', err);
        }
      });

      // Offline events
      this.eventSource.addEventListener('offline', (e) => {
        this.emit('offline', {});
      });

      // Generic message handler
      this.eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('message', data);
        } catch (err) {
          console.error('[SSE] Failed to parse message:', err);
        }
      };

    } catch (error) {
      console.error('[SSE] Connection error:', error);
      this.isConnecting = false;
      this.handleReconnect(apiUrl);
    }
  }

  handleReconnect(url) {
    if (this.isManualDisconnect) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );

      this.emit('connection', { status: 'reconnecting', attempt: this.reconnectAttempts });

      setTimeout(() => {
        this.cleanup();
        this.connect(url);
      }, delay);
    } else {
      this.emit('connection', { status: 'failed' });
    }
  }

  cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.cleanup();
    this.emit('connection', { status: 'disconnected' });
  }

  reconnect() {
    this.reconnectAttempts = 0;
    this.isManualDisconnect = false;
    this.cleanup();
    this.connect();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error('[SSE] Listener error:', err);
        }
      });
    }
  }

  getStatus() {
    return {
      connected: !!this.eventSource && !this.isConnecting,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      listenersCount: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

export const sseService = new SSEService();
export default sseService;