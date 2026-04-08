import { eq, asc } from 'drizzle-orm';
import { db, events } from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

    try {
      const rows = await db
        .select()
        .from(events)
        .where(eq(events.userId, String(userId)))
        .orderBy(asc(events.startAt));
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch events', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const { userId, title, startAt, endAt, allDay = false } = req.body;
    if (!userId || !title || !String(title).trim() || !startAt || !endAt) {
      return res.status(400).json({ error: 'userId, title, startAt and endAt are required' });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({ error: 'Invalid startAt/endAt values' });
    }

    try {
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
      return res.status(500).json({ error: 'Failed to create event', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
