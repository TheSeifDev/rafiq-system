/**
 * api/routes/test.js - SSE Test Routes for GUI Testing
 * These endpoints simulate AI events for testing the GUI
 */

import { broadcast, broadcastAIState, broadcastSpeaking, broadcastEmergency } from '../../sockets/sse.js';

export async function registerTestRoutes(app) {
  // Test AI state changes
  app.post('/test/ai-state', async (req) => {
    const { state, emotion } = req.body;

    broadcastAIState(state, emotion);
    console.log(`[Test] AI State: ${state}${emotion ? ` (${emotion})` : ''}`);

    return { success: true, state, emotion };
  });

  // Test speaking
  app.post('/test/speaking', async (req) => {
    const { text, emotion } = req.body;

    broadcastSpeaking(text, emotion);
    console.log(`[Test] Speaking: ${text}`);

    return { success: true, text };
  });

  // Test emergency
  app.post('/test/emergency', async (req) => {
    const { level, message } = req.body;

    broadcastEmergency(level, message);
    console.log(`[Test] Emergency: [${level}] ${message}`);

    return { success: true, level, message };
  });

  // Sequence test - runs a demo interaction
  app.post('/test/demo', async (req) => {
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // Demo sequence
    broadcastAIState('listening');
    await delay(2000);

    broadcastAIState('thinking');
    await delay(1500);

    broadcastSpeaking('Hello! I am RAFIQ, your AI healthcare assistant. How can I help you today?');
    await delay(5000);

    broadcastAIState('idle');

    return { success: true, message: 'Demo sequence started' };
  });

  // Clear emergency
  app.post('/test/clear-emergency', async () => {
    broadcast('emergency_clear', { cleared: true });
    return { success: true };
  });
}