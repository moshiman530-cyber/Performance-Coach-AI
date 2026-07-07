import { Router } from "express";
import { db } from "@workspace/db";
import { athletes } from "@workspace/db";
import { UpsertAthleteBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/athletes/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [athlete] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.userId, req.user.id))
    .limit(1);

  if (!athlete) {
    return res.status(404).json({ error: "Athlete profile not found" });
  }

  return res.json(athlete);
});

router.put("/athletes/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = UpsertAthleteBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const userId = req.user.id;

  const [existing] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(athletes)
      .set(parsed.data)
      .where(eq(athletes.userId, userId))
      .returning();
    return res.json(updated);
  } else {
    const [created] = await db
      .insert(athletes)
      .values({ ...parsed.data, userId })
      .returning();
    return res.json(created);
  }
});

export default router;
