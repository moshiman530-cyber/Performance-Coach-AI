import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletes } from "./athletes";

export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id, { onDelete: "cascade" }),
  sport: text("sport").notNull(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  notes: text("notes"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({
  id: true,
  createdAt: true,
  athleteId: true,
});

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
