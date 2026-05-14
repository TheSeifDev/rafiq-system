# RAFIQ API Contracts

All IDs are UUID strings. API consumers must not coerce IDs to numbers.

## Backend Base

Default backend URL: `http://localhost:3001`

Authenticated routes require `x-api-key: $RAFIQ_API_KEY`.

## Patients

- `GET /patients` returns `{ success, data: Patient[] }`
- `GET /patients/:id` returns one patient by UUID
- `POST /patients` accepts `{ id?, user_id?, full_name | name, age?, phone?, medical_history?, notes? }`
- `PUT /patients/:id` accepts patient patch fields
- `DELETE /patients/:id` soft deletes and queues a delete sync

## Reminders

- `GET /reminders?patient_id=&done=` filters by UUID patient and completion state
- `POST /reminders` accepts `{ id?, patient_id, user_id?, title, description?, time | datetime, repeat? }`
- `PATCH /reminders/:id/done` marks complete and queues sync

## Alerts and Emergency

- `GET /alerts?patient_id=&resolved=&limit=`
- `POST /alerts` accepts `{ id?, patient_id?, user_id?, type?, message, severity?, source?, data? }`
- `PATCH /alerts/:id/resolve`
- `GET /emergency-events?patient_id=&status=`
- `POST /emergency` accepts `{ patient_id?, user_id?, type?, severity?, message?, location?, data? }`
- `PATCH /emergency/:id/resolve`
- `POST /emergency/broadcast` creates a critical alert and broadcasts SSE

## Notifications

- `POST /notifications` accepts `{ user_id, patient_id?, title, body, type?, category?, severity?, data?, screen?, source?, idempotency_key? }`
- `GET /notifications/:userId?limit=`
- `GET /notifications/:userId/unread`
- `PATCH /notifications/:id/read` accepts `{ userId | user_id }`
- `POST /notifications/:userId/read-all`

Critical notifications are persisted locally, queued for Supabase, broadcast via SSE, and published to MQTT `rafiq/alerts/{user_id}` when MQTT is connected.

## Smart Home and MQTT

- `GET /smarthome?room=`
- `GET /smarthome/:id` resolves by smart-home UUID or MQTT topic
- `POST /smarthome/cmd` accepts `{ room, device, command }`
- `POST /smarthome/batch` accepts `{ commands: [{ room, device, command }] }`
- `GET /devices?patient_id=`

MQTT topics:
- `rafiq/smarthome/{room}/{device}/state`
- `rafiq/smarthome/{room}/{device}/cmd`
- `rafiq/alerts/{patient_id}`
- `rafiq/sensor/{room}/{sensor}`

## Sync

- `POST /sync/push` flushes backend `pending_sync`
- `POST /sync/pull` pulls canonical cloud rows into backend SQLite

Realtime/SSE:
- `GET /events` opens Server-Sent Events
- Events: `alert`, `emergency`, `device`, `ai_state`, `speaking`, `emotion`, `offline`

