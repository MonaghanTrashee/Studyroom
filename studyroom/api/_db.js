import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

const client = neon(process.env.DATABASE_URL);
export const db = drizzle(client);

export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  allDay: boolean('all_day').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  waterReminderEnabled: boolean('water_reminder_enabled').notNull().default(true),
  waterReminderMinutes: integer('water_reminder_minutes').notNull().default(45),
  pomodoroBreakMinutes: integer('pomodoro_break_minutes').notNull().default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
