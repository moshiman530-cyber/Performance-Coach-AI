import { Router } from "express";
import { db, conversations, messages, athletes, personalRecords } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CreateOpenaiConversationBody, SendOpenaiMessageBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/openai/conversations", async (req, res) => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  return res.json(rows);
});

router.post("/openai/conversations", async (req, res) => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const [conv] = await db.insert(conversations).values(parsed.data).returning();
  return res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Conversation not found" });

  return res.status(204).send();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const athleteRows = await db.select().from(athletes).limit(1);
  const athlete = athleteRows[0];

  const prRows = await db
    .select()
    .from(personalRecords)
    .orderBy(desc(personalRecords.achievedAt))
    .limit(20);

  const prSummary =
    prRows.length > 0
      ? prRows
          .map((r) => `${r.sport} - ${r.category}: ${r.value} ${r.unit}`)
          .join(", ")
      : "No PRs logged yet";

  const systemPrompt = `You are PR Coach, an expert AI athletic coach and motivator. You help athletes track personal records, analyze progress, and improve performance.
${
  athlete
    ? `
Athlete profile:
- Name: ${athlete.name}
- Sport: ${athlete.sport}
- Experience level: ${athlete.experienceLevel}
- Goals: ${athlete.goals ?? "Not specified"}
- Weekly schedule: ${athlete.weeklySchedule ?? "Not specified"}
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
  res.end();
});

export default router;
