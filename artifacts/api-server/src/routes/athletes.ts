import { Router } from "express";
import { db } from "@workspace/db";
import { athletes } from "@workspace/db";
import { UpsertAthleteBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

const SINGLE_ATHLETE_ID = 1;

router.get("/athletes/me", async (req, res) => {
  const [athlete] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.id, SINGLE_ATHLETE_ID))
    .limit(1);

  if (!athlete) {
    return res.status(404).json({ error: "Athlete profile not found" });
  }

  return res.json(athlete);
});

router.put("/athletes/me", async (req, res) => {
  const parsed = UpsertAthleteBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const existing = await db
    .select()
    .from(athletes)
    .where(eq(athletes.id, SINGLE_ATHLETE_ID))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(athletes)
      .set(parsed.data)
      .where(eq(athletes.id, SINGLE_ATHLETE_ID))
      .returning();
    return res.json(updated);
  } else {
    const [created] = await db
      .insert(athletes)
      .values({ ...parsed.data, id: SINGLE_ATHLETE_ID } as typeof athletes.$inferInsert)
      .returning();
    return res.json(created);
  }
});

export default router;
