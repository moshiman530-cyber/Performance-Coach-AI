import { Router } from "express";
import { db, conversations, messages, athletes, personalRecords, prGoals } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CreateOpenaiConversationBody, SendOpenaiMessageBody } from "@workspace/api-zod";
import { eq, and, desc, gte } from "drizzle-orm";

const router = Router();

router.get("/openai/conversations", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, req.user.id))
    .orderBy(desc(conversations.createdAt));
  return res.json(rows);
});

router.post("/openai/conversations", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [conv] = await db
    .insert(conversations)
    .values({ ...parsed.data, userId: req.user.id })
    .returning();
  return res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, req.user.id)))
    .limit(1);

  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  return res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, req.user.id)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Conversation not found" });

  return res.status(204).send();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  return res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, req.user.id)))
    .limit(1);

  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const [athleteRow] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.userId, req.user.id))
    .limit(1);

  const prRows = await db
    .select()
    .from(personalRecords)
    .where(athleteRow ? eq(personalRecords.athleteId, athleteRow.id) : eq(personalRecords.id, -1))
    .orderBy(desc(personalRecords.achievedAt))
    .limit(20);

  const prSummary =
    prRows.length > 0
      ? prRows.map((r) => `${r.sport} - ${r.category}: ${r.value} ${r.unit}`).join(", ")
      : "No PRs logged yet";

  const systemPrompt = `You are PR Coach, an expert AI athletic coach and motivator. You help athletes track personal records, analyze progress, and improve performance.
${
  athleteRow
    ? `
Athlete profile:
- Name: ${athleteRow.name}
- Sport: ${athleteRow.sport}
- Experience level: ${athleteRow.experienceLevel}
- Goals: ${athleteRow.goals ?? "Not specified"}
- Weekly schedule: ${athleteRow.weeklySchedule ?? "Not specified"}
`
    : ""
}
Current personal records: ${prSummary}

Your role:
- Analyze progress trends and explain WHY improvement is happening
- Celebrate new PRs enthusiastically
- Suggest specific, actionable training improvements
- Predict realistic future performance based on recent trends
- Answer fitness and training questions in a friendly, motivating tone
- Be specific and data-driven — reference the athlete's actual PRs when giving advice

Do not use emojis. Keep responses concise and actionable.`;

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: parsed.data.content },
  ];

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: parsed.data.content,
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  return res.end();
});

// Weekly training summary — SSE streaming endpoint
router.get("/openai/summary/weekly", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [athleteRow] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.userId, req.user.id))
    .limit(1);

  const prRows = await db
    .select()
    .from(personalRecords)
    .where(athleteRow ? eq(personalRecords.athleteId, athleteRow.id) : eq(personalRecords.id, -1))
    .orderBy(desc(personalRecords.achievedAt))
    .limit(50);

  // PRs from the last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPRs = prRows.filter((r) => new Date(r.achievedAt) >= oneWeekAgo);

  const goalRows = await db
    .select()
    .from(prGoals)
    .where(athleteRow ? eq(prGoals.athleteId, athleteRow.id) : eq(prGoals.id, -1))
    .orderBy(prGoals.createdAt);

  const prSummary =
    prRows.length > 0
      ? prRows.map((r) => `${r.sport} - ${r.category}: ${r.value} ${r.unit} (${r.achievedAt})`).join("\n")
      : "No PRs logged yet";

  const recentSummary =
    recentPRs.length > 0
      ? recentPRs.map((r) => `${r.sport} - ${r.category}: ${r.value} ${r.unit}`).join("\n")
      : "No new PRs this week";

  const goalSummary =
    goalRows.length > 0
      ? goalRows.map((g) => `${g.sport} - ${g.category}: target ${g.targetValue} ${g.unit}${g.deadline ? ` by ${g.deadline}` : ""}`).join("\n")
      : "No goals set";

  const systemPrompt = `You are PR Coach, an expert AI athletic coach. Generate a concise weekly training summary for the athlete.
${
  athleteRow
    ? `Athlete: ${athleteRow.name}, ${athleteRow.sport}, ${athleteRow.experienceLevel} level.`
    : "Athlete profile not set up yet."
}

All-time PRs:
${prSummary}

PRs logged this week:
${recentSummary}

Active goals:
${goalSummary}

Write a weekly summary with these sections:
1. THIS WEEK — what PRs were set (or note if it was a rest week)
2. PROGRESS TOWARD GOALS — how close they are to each active goal, be specific with numbers
3. FOCUS FOR NEXT WEEK — 2-3 specific, actionable training recommendations

Be direct, data-driven, and motivating. No emojis. Keep it under 250 words total.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 512,
    messages: [{ role: "system", content: systemPrompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  return res.end();
});

export default router;
