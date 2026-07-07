import { Router } from "express";
import { db } from "@workspace/db";
import { prGoals, athletes } from "@workspace/db";
import { CreateGoalBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getAthleteId(userId: string): Promise<number | null> {
  const [athlete] = await db
    .select({ id: athletes.id })
    .from(athletes)
    .where(eq(athletes.userId, userId))
    .limit(1);
  return athlete?.id ?? null;
}

router.get("/goals", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.json([]);

  const rows = await db
    .select()
    .from(prGoals)
    .where(eq(prGoals.athleteId, athleteId))
    .orderBy(prGoals.createdAt);

  return res.json(rows);
});

router.post("/goals", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.status(404).json({ error: "Athlete profile not found" });

  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [goal] = await db
    .insert(prGoals)
    .values({ ...parsed.data, athleteId })
    .returning();

  return res.status(201).json(goal);
});

router.delete("/goals/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.status(404).json({ error: "Not found" });

  const [deleted] = await db
    .delete(prGoals)
    .where(and(eq(prGoals.id, id), eq(prGoals.athleteId, athleteId)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Goal not found" });

  return res.status(204).send();
});

export default router;
