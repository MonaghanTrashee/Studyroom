const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { sql } = require('drizzle-orm');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in server/.env');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function ensureSchema() {
  await db.execute(sql`
    create table if not exists todos (
      id serial primary key,
      user_id text not null,
      text text not null,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists events (
      id serial primary key,
      user_id text not null,
      title text not null,
      start_at timestamptz not null,
      end_at timestamptz not null,
      all_day boolean not null default false,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    alter table events
    add column if not exists all_day boolean not null default false;
  `);

  await db.execute(sql`
    create table if not exists user_settings (
      id serial primary key,
      user_id text not null unique,
      water_reminder_enabled boolean not null default true,
      water_reminder_minutes integer not null default 45,
      pomodoro_break_minutes integer not null default 5,
      updated_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    alter table user_settings
    add column if not exists water_reminder_enabled boolean not null default true;
  `);

  await db.execute(sql`
    alter table user_settings
    add column if not exists water_reminder_minutes integer not null default 45;
  `);

  await db.execute(sql`
    alter table user_settings
    add column if not exists pomodoro_break_minutes integer not null default 5;
  `);

  await db.execute(sql`
    alter table user_settings
    add column if not exists updated_at timestamptz not null default now();
  `);
}

module.exports = { db, ensureSchema };
