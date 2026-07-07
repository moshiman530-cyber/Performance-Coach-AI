import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { athletes } from "./athletes";

export const prGoals = pgTable("pr_goals", {
  id: serial("id").primaryKey(),
  athleteId: integer("athlete_id").notNull().references(() => athletes.id, { onDelete: "cascade" }),
  sport: text("sport").notNull(),
  category: text("category").notNull(),
  targetValue: text("target_value").notNull(),
  unit: text("unit").notNull(),
  deadline: date("deadline"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPrGoalSchema = createInsertSchema(prGoals).omit({
  id: true,
  createdAt: true,
  athleteId: true,
});

export type PrGoal = typeof prGoals.$inferSelect;
export type InsertPrGoal = z.infer<typeof insertPrGoalSchema>;
