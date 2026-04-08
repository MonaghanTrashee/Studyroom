const express = require('express');
const cors = require('cors');
const { eq, and, desc, asc } = require('drizzle-orm');
const { db, ensureSchema } = require('./db');
const { todos, events, userSettings } = require('./schema');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '127.0.0.1';

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://studyroom.trashee.art',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/settings', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query param' });
    }

    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, String(userId)));

    return res.json(row || null);
  } catch (error) {
    console.error('GET /api/settings failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch settings',
      details: error?.cause?.message || error.message,
    });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const {
      userId,
      waterReminderEnabled = true,
      waterReminderMinutes = 45,
      pomodoroBreakMinutes = 5,
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const normalizedSettings = {
      userId: String(userId),
      waterReminderEnabled: Boolean(waterReminderEnabled),
      waterReminderMinutes: Number(waterReminderMinutes),
      pomodoroBreakMinutes: Number(pomodoroBreakMinutes),
      updatedAt: new Date(),
    };

    if (
      !Number.isFinite(normalizedSettings.waterReminderMinutes) ||
      !Number.isFinite(normalizedSettings.pomodoroBreakMinutes)
    ) {
      return res.status(400).json({ error: 'Invalid settings values' });
    }

    const [existing] = await db
      .select({ id: userSettings.id })
      .from(userSettings)
      .where(eq(userSettings.userId, normalizedSettings.userId));

    let saved;
    if (existing) {
      [saved] = await db
        .update(userSettings)
        .set(normalizedSettings)
        .where(eq(userSettings.userId, normalizedSettings.userId))
        .returning();
    } else {
      [saved] = await db.insert(userSettings).values(normalizedSettings).returning();
    }

    return res.json(saved);
  } catch (error) {
    console.error('PUT /api/settings failed:', error);
    return res.status(500).json({
      error: 'Failed to save settings',
      details: error?.cause?.message || error.message,
    });
  }
});

app.get('/api/todos', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query param' });
    }

    const rows = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, String(userId)))
      .orderBy(desc(todos.createdAt));

    return res.json(rows);
  } catch (error) {
    console.error('GET /api/todos failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch todos',
      details: error?.cause?.message || error.message,
    });
  }
});

app.post('/api/todos', async (req, res) => {
  try {
    const { userId, text } = req.body;
    if (!userId || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'userId and text are required' });
    }

    const [inserted] = await db
      .insert(todos)
      .values({ userId: String(userId), text: String(text).trim() })
      .returning();

    return res.status(201).json(inserted);
  } catch (error) {
    console.error('POST /api/todos failed:', error);
    return res.status(500).json({
      error: 'Failed to create todo',
      details: error?.cause?.message || error.message,
    });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid todo id' });
    }

    const [deleted] = await db.delete(todos).where(eq(todos.id, id)).returning();
    if (!deleted) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    return res.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error('DELETE /api/todos/:id failed:', error);
    return res.status(500).json({
      error: 'Failed to delete todo',
      details: error?.cause?.message || error.message,
    });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query param' });
    }

    const rows = await db
      .select()
      .from(events)
      .where(eq(events.userId, String(userId)))
      .orderBy(asc(events.startAt));

    return res.json(rows);
  } catch (error) {
    console.error('GET /api/events failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch events',
      details: error?.cause?.message || error.message,
    });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { userId, title, startAt, endAt, allDay = false } = req.body;
    if (!userId || !title || !String(title).trim() || !startAt || !endAt) {
      return res
        .status(400)
        .json({ error: 'userId, title, startAt and endAt are required' });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return res.status(400).json({ error: 'Invalid startAt/endAt values' });
    }

    const [inserted] = await db
      .insert(events)
      .values({
        userId: String(userId),
        title: String(title).trim(),
        startAt: startDate,
        endAt: endDate,
        allDay: Boolean(allDay),
      })
      .returning();

    return res.status(201).json(inserted);
  } catch (error) {
    console.error('POST /api/events failed:', error);
    return res.status(500).json({
      error: 'Failed to create event',
      details: error?.cause?.message || error.message,
    });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { userId } = req.query;
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query param' });
    }

    const [deleted] = await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.userId, String(userId))))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error('DELETE /api/events/:id failed:', error);
    return res.status(500).json({
      error: 'Failed to delete event',
      details: error?.cause?.message || error.message,
    });
  }
});

async function start() {
  try {
    await ensureSchema();
  } catch (error) {
    console.warn(
      'DB init failed, API still starting:',
      error?.cause?.message || error.message
    );
  }



const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server beží na porte ${PORT}`);
});

server.on('error', (error) => {
  if (error.syscall !== 'listen') throw error;
  console.error(`Chyba pri štarte: ${error}`);
  process.exit(1);
});
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
