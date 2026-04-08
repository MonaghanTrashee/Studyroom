import { eq } from 'drizzle-orm';
import { db, userSettings } from './_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId query param' });

    try {
      const [row] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, String(userId)));
      return res.json(row || null);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
    }
  }

  if (req.method === 'PUT') {
    const {
      userId,
      waterReminderEnabled = true,
      waterReminderMinutes = 45,
      pomodoroBreakMinutes = 5,
    } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const normalized = {
      userId: String(userId),
      waterReminderEnabled: Boolean(waterReminderEnabled),
      waterReminderMinutes: Number(waterReminderMinutes),
      pomodoroBreakMinutes: Number(pomodoroBreakMinutes),
      updatedAt: new Date(),
    };

    if (!Number.isFinite(normalized.waterReminderMinutes) || !Number.isFinite(normalized.pomodoroBreakMinutes)) {
      return res.status(400).json({ error: 'Invalid settings values' });
    }

    try {
      const [existing] = await db
        .select({ id: userSettings.id })
        .from(userSettings)
        .where(eq(userSettings.userId, normalized.userId));

      let saved;
      if (existing) {
        [saved] = await db
          .update(userSettings)
          .set(normalized)
          .where(eq(userSettings.userId, normalized.userId))
          .returning();
      } else {
        [saved] = await db.insert(userSettings).values(normalized).returning();
      }

      return res.json(saved);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to save settings', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
