/**
 * services/ai.js - AI service for RAFIQ
 * Supports local Ollama and optional cloud Anthropic
 */

import Anthropic from '@anthropic-ai/sdk';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function isAiConfigured() {
  return !!anthropic || isOllamaAvailable();
}

export function isOllamaAvailable() {
  return !!process.env.OLLAMA_URL;
}

/**
 * Send chat to Ollama (local)
 */
export async function chatWithOllama(message, systemPrompt = '', model = 'llama3') {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: message }
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

/**
 * Send chat to Anthropic (cloud)
 */
export async function chatWithAnthropic(message, systemPrompt = '') {
  if (!anthropic) {
    throw new Error('Anthropic not configured');
  }

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  return msg.content[0].text.trim();
}

/**
 * Main chat function - tries Ollama first, falls back to Anthropic
 */
export async function chat(message, options = {}) {
  const { systemPrompt, model, patientContext } = options;

  // Build context from patient data if provided
  const contextParts = [];
  if (patientContext) {
    if (patientContext.name) contextParts.push(`المريض: ${patientContext.name}`);
    if (patientContext.age) contextParts.push(`العمر: ${patientContext.age}`);
    if (patientContext.medical_history) contextParts.push(`التاريخ الطبي: ${patientContext.medical_history}`);
    if (patientContext.notes) contextParts.push(`ملاحظات: ${patientContext.notes}`);
    if (patientContext.reminders?.length) {
      contextParts.push(`التذكيرات القادمة: ${patientContext.reminders.join('، ')}`);
    }
    if (patientContext.alerts?.length) {
      contextParts.push(`تنبيهات نشطة: ${patientContext.alerts.join('؛ ')}`);
    }
    if (patientContext.contacts?.length) {
      contextParts.push(`جهات طوارئ: ${patientContext.contacts.join('، ')}`);
    }
  }

  const basePrompt = [
    'أنت رفيق، مساعد طبي ذكي مخصص للرعاية الصحية على أجهزة المعالجة الطرفية.',
    'ردودك قصيرة وواضحة وتصلح للتحدث بصوت عالٍ (TTS).',
    'رد بنفس لغة سؤال المستخدم (عربي أو إنجليزي).',
    'لا تذكر روابط أو أكواد. كن دافئاً ومحترفاً.',
    contextParts.length ? `\nمعلومات المريض:\n${contextParts.join('\n')}` : '',
  ].join('\n');

  const finalSystem = systemPrompt ? `${basePrompt}\n\n${systemPrompt}` : basePrompt;

  // Try Ollama first if available
  if (isOllamaAvailable()) {
    try {
      return await chatWithOllama(message, finalSystem, model || 'llama3');
    } catch (err) {
      console.warn('[ai] Ollama failed, trying Anthropic:', err.message);
    }
  }

  // Fall back to Anthropic
  if (anthropic) {
    return await chatWithAnthropic(message, finalSystem);
  }

  throw new Error('No AI provider available');
}

/**
 * Simple intent classification for voice commands
 */
export function classifyIntent(message) {
  const lower = message.toLowerCase();

  if (/تنبيه|طوارئ|ساعدني|help|emergency|sos/i.test(lower)) {
    return 'emergency';
  }
  if (/open|شغل|on|تشغيل/i.test(lower)) {
    return 'device_on';
  }
  if (/close|اطفاء|off|إيقاف/i.test(lower)) {
    return 'device_off';
  }
  if (/reminder|تذكير|موعد/i.test(lower)) {
    return 'reminder';
  }
  if (/question|سؤال|ما هو|كيف/i.test(lower)) {
    return 'question';
  }

  return 'general';
}