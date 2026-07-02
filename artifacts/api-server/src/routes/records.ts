import { Router } from "express";
import { db } from "@workspace/db";
import { personalRecords } from "@workspace/db";
import { CreateRecordBody } from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/records", async (req, res) => {
  const { sport, category } = req.query;

  const conditions = [];
  if (sport && typeof sport === "string") {
    conditions.push(eq(personalRecords.sport, sport));
  }
  if (category && typeof category === "string") {
    conditions.push(eq(personalRecords.category, category));
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(personalRecords)
          .where(and(...conditions))
          .orderBy(desc(personalRecords.achievedAt))
      : await db
          .select()
          .from(personalRecords)
          .orderBy(desc(personalRecords.achievedAt));

  return res.json(rows);
});

router.post("/records", async (req, res) => {
  const parsed = CreateRecordBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const [record] = await db
    .insert(personalRecords)
    .values(parsed.data)
    .returning();

  return res.status(201).json(record);
});

router.delete("/records/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const [deleted] = await db
    .delete(personalRecords)
    .where(eq(personalRecords.id, id))
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "Record not found" });
  }

  return res.status(204).send();
});

router.get("/records/summary", async (req, res) => {
  const rows = await db
    .select()
    .from(personalRecords)
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
  const limit = parseInt((req.query.limit as string) ?? "5", 10);
  const rows = await db
    .select()
    .from(personalRecords)
    .orderBy(desc(personalRecords.achievedAt))
    .limit(isNaN(limit) ? 5 : limit);

  return res.json(rows);
});

router.get("/records/history/:sport/:category", async (req, res) => {
  const { sport, category } = req.params;
  const rows = await db
    .select()
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.sport, sport),
        eq(personalRecords.category, category)
      )
    )
    .orderBy(desc(personalRecords.achievedAt));

  return res.json(rows);
});

export default router;
