# RAFIQ Reference ORM Schemas

RAFIQ does not use Prisma or Drizzle as runtime ORMs. These reference snippets exist to document the canonical shape for future tooling.

## Prisma Reference

```prisma
model Patient {
  id        String   @id @db.Uuid
  legacyId String?  @unique @map("legacy_id")
  userId    String?  @map("user_id") @db.Uuid
  fullName  String   @map("full_name")
  age       Int?
  gender    String?
  phone     String?
  version   Int      @default(1)
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  vitals        VitalsReading[]
  medications   Medication[]
  reminders     Reminder[]
  notifications Notification[]

  @@map("patients")
}

model VitalsReading {
  id          String   @id @db.Uuid
  patientId   String   @map("patient_id") @db.Uuid
  userId      String?  @map("user_id") @db.Uuid
  source      String   @default("manual")
  heartRate   Int?     @map("heart_rate")
  oxygenLevel Float?   @map("oxygen_level")
  rawPayload  Json     @map("raw_payload")
  recordedAt  DateTime @map("recorded_at")
  createdAt   DateTime @default(now()) @map("created_at")

  patient Patient @relation(fields: [patientId], references: [id])

  @@map("vitals_readings")
}

model PendingSync {
  id             String   @id @db.Uuid
  userId         String?  @map("user_id") @db.Uuid
  deviceId       String?  @map("device_id") @db.Uuid
  tableName      String   @map("table_name")
  recordId       String   @map("record_id") @db.Uuid
  operation      String
  payload        Json
  idempotencyKey String   @map("idempotency_key")
  priority       String   @default("normal")
  attempts       Int      @default(0)
  maxAttempts    Int      @default(5) @map("max_attempts")
  nextAttemptAt  DateTime @map("next_attempt_at")
  status         String   @default("pending")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@unique([userId, idempotencyKey])
  @@map("pending_sync")
}
```

## Drizzle Reference

```ts
import { pgTable, text, uuid, integer, timestamp, jsonb, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey(),
  legacyId: text('legacy_id'),
  userId: uuid('user_id'),
  fullName: text('full_name').notNull(),
  age: integer('age'),
  gender: text('gender'),
  phone: text('phone'),
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vitalsReadings = pgTable('vitals_readings', {
  id: uuid('id').primaryKey(),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  userId: uuid('user_id'),
  source: text('source').notNull().default('manual'),
  heartRate: integer('heart_rate'),
  oxygenLevel: integer('oxygen_level'),
  rawPayload: jsonb('raw_payload').notNull().default({}),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pendingSync = pgTable('pending_sync', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id'),
  deviceId: uuid('device_id'),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  operation: text('operation').notNull(),
  payload: jsonb('payload').notNull().default({}),
  idempotencyKey: text('idempotency_key').notNull(),
  priority: text('priority').notNull().default('normal'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  userIdIdempotency: uniqueIndex('pending_sync_user_id_idempotency_key').on(table.userId, table.idempotencyKey),
}));
```
