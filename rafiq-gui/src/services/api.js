const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  // Get system status
  async getStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error('Status request failed');
      return response.json();
    } catch (error) {
      console.error('[API] Failed to get status:', error);
      return { error: error.message };
    }
  },

  // Send command to backend
  async sendCommand(command) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Command request failed');
      return response.json();
    } catch (error) {
      console.error('[API] Failed to send command:', error);
      return { error: error.message };
    }
  },

  // Get settings
  async getSettings() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error('Settings request failed');
      return response.json();
    } catch (error) {
      console.error('[API] Failed to get settings:', error);
      return { error: error.message };
    }
  },

  // Update settings
  async updateSettings(settings) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Settings update failed');
      return response.json();
    } catch (error) {
      console.error('[API] Failed to update settings:', error);
      return { error: error.message };
    }
  },

  // Get AI health status
  async getAIHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error('AI health check failed');
      return response.json();
    } catch (error) {
      console.error('[API] Failed to get AI health:', error);
      return { success: false, configured: false };
    }
  }
};

export default api;