import { eq, desc } from 'drizzle-orm';
import { db, todos } from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

    try {
      const rows = await db
        .select()
        .from(todos)
        .where(eq(todos.userId, String(userId)))
        .orderBy(desc(todos.createdAt));
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch todos', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const { userId, text } = req.body;
    if (!userId || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'userId and text are required' });
    }

    try {
      const [inserted] = await db
        .insert(todos)
        .values({ userId: String(userId), text: String(text).trim() })
        .returning();
      return res.status(201).json(inserted);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create todo', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
