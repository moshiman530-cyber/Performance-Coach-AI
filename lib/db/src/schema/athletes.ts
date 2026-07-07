import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const athletes = pgTable("athletes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  name: text("name").notNull(),
  age: integer("age"),
  height: text("height"),
  weight: text("weight"),
  sport: text("sport").notNull(),
  experienceLevel: text("experience_level").notNull(),
  weeklySchedule: text("weekly_schedule"),
  goals: text("goals"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAthleteSchema = createInsertSchema(athletes).omit({
  id: true,
  createdAt: true,
});

export type Athlete = typeof athletes.$inferSelect;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
