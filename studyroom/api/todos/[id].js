import { eq } from 'drizzle-orm';
import { db, todos } from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid todo id' });

    try {
      const [deleted] = await db.delete(todos).where(eq(todos.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: 'Todo not found' });
      return res.json({ ok: true, deletedId: id });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete todo', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
