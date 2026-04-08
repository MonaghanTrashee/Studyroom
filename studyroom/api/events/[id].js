import { and, eq } from 'drizzle-orm';
import { db, events } from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    const { userId } = req.query;
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid event id' });
    if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

    try {
      const [deleted] = await db
        .delete(events)
        .where(and(eq(events.id, id), eq(events.userId, String(userId))))
        .returning();
      if (!deleted) return res.status(404).json({ error: 'Event not found' });
      return res.json({ ok: true, deletedId: id });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete event', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
