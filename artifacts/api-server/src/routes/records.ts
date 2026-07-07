import { Router } from "express";
import { db } from "@workspace/db";
import { personalRecords, athletes } from "@workspace/db";
import { CreateRecordBody } from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

async function getAthleteId(userId: string): Promise<number | null> {
  const [athlete] = await db
    .select({ id: athletes.id })
    .from(athletes)
    .where(eq(athletes.userId, userId))
    .limit(1);
  return athlete?.id ?? null;
}

router.get("/records", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.json([]);

  const { sport, category } = req.query;

  const conditions = [eq(personalRecords.athleteId, athleteId)];
  if (sport && typeof sport === "string") conditions.push(eq(personalRecords.sport, sport));
  if (category && typeof category === "string") conditions.push(eq(personalRecords.category, category));

  const rows = await db
    .select()
    .from(personalRecords)
    .where(and(...conditions))
    .orderBy(desc(personalRecords.achievedAt));

  return res.json(rows);
});

router.post("/records", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.status(404).json({ error: "Athlete profile not found" });

  const parsed = CreateRecordBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [record] = await db
    .insert(personalRecords)
    .values({ ...parsed.data, athleteId })
    .returning();

  return res.status(201).json(record);
});

router.delete("/records/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.status(404).json({ error: "Not found" });

  const [deleted] = await db
    .delete(personalRecords)
    .where(and(eq(personalRecords.id, id), eq(personalRecords.athleteId, athleteId)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Record not found" });

  return res.status(204).send();
});

router.get("/records/summary", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.json({ totalPRs: 0, sports: [] });

  const rows = await db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.athleteId, athleteId))
    .orderBy(desc(personalRecords.achievedAt));

  const grouped: Record<string, Record<string, typeof rows>> = {};
  for (const row of rows) {
    if (!grouped[row.sport]) grouped[row.sport] = {};
    if (!grouped[row.sport][row.category]) grouped[row.sport][row.category] = [];
    grouped[row.sport][row.category].push(row);
  }

  const sports = Object.entries(grouped).map(([sport, cats]) => ({
    sport,
    count: Object.values(cats).reduce((sum, arr) => sum + arr.length, 0),
    categories: Object.entries(cats).map(([category, records]) => ({
      category,
      latestValue: records[0].value,
      unit: records[0].unit,
      count: records.length,
    })),
  }));

  return res.json({ totalPRs: rows.length, sports });
});

router.get("/records/recent", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.json([]);

  const limit = parseInt((req.query.limit as string) ?? "5", 10);
  const rows = await db
    .select()
    .from(personalRecords)
    .where(eq(personalRecords.athleteId, athleteId))
    .orderBy(desc(personalRecords.achievedAt))
    .limit(isNaN(limit) ? 5 : limit);

  return res.json(rows);
});

router.get("/records/history/:sport/:category", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const athleteId = await getAthleteId(req.user.id);
  if (!athleteId) return res.json([]);

  const { sport, category } = req.params;
  const rows = await db
    .select()
    .from(personalRecords)
    .where(and(
      eq(personalRecords.athleteId, athleteId),
      eq(personalRecords.sport, sport),
      eq(personalRecords.category, category)
    ))
    .orderBy(desc(personalRecords.achievedAt));

  return res.json(rows);
});

export default router;
