# RAFIQ — Edge AI Healthcare & Smart Assistant

<div align="center">

![Status](https://img.shields.io/badge/status-active-success)
![Backend](https://img.shields.io/badge/backend-Fastify-black)
![Database](https://img.shields.io/badge/database-SQLite-blue)
![AI](https://img.shields.io/badge/AI-Ollama%20%2B%20Whisper-orange)
![Platform](https://img.shields.io/badge/platform-Edge%20AI-green)

Offline-First Edge AI Healthcare & Smart Home Assistant

</div>

---

# 📌 Overview | نظرة عامة

## English

RAFIQ is an offline-first Edge AI healthcare assistant designed for elderly care, patient monitoring, smart-home automation, and emergency handling.

The system runs locally on a Mini PC and is optimized for:
- low latency
- local AI inference
- offline operation
- real-time alerts
- smart-home communication
- healthcare monitoring

The project combines:
- AI voice assistant
- local LLMs
- MQTT smart-home devices
- SQLite local database
- Electron GUI
- React Native mobile app
- cloud synchronization

---

## العربية

رفيق هو مساعد ذكي للرعاية الصحية يعمل محليًا (Offline-First) ومصمم لمتابعة المرضى وكبار السن والتحكم في المنزل الذكي وإدارة حالات الطوارئ.

النظام يعمل على Mini PC داخل المنزل ومصمم ليكون:
- سريع جدًا
- يعمل بدون إنترنت
- يدعم الذكاء الاصطناعي المحلي
- يدعم التنبيهات الفورية
- يدعم أجهزة المنزل الذكي
- يدعم متابعة الحالة الصحية

المشروع يجمع بين:
- مساعد صوتي ذكي
- نماذج ذكاء اصطناعي محلية
- MQTT للأجهزة الذكية
- قاعدة بيانات SQLite
- واجهة Electron
- تطبيق موبايل React Native
- مزامنة سحابية

---

# 🏗️ System Architecture | معمارية النظام

```text
rafiq-system/
│
├── rafiq-ai         → AI Runtime (Whisper + Ollama + TTS)
├── rafiq-gui        → Electron GUI
├── rafiq-backend    → Main Backend System
└── rafiq-app        → Mobile Application