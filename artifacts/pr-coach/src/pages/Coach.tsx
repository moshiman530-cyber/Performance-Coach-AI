import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Trash2, MessageSquare, Zap, Bot, User } from "lucide-react";

function ConversationView({ conversationId }: { conversationId: number }) {
  const queryClient = useQueryClient();
  const { data: conversation, isLoading } = useGetOpenaiConversation(conversationId, {
    query: { queryKey: getGetOpenaiConversationQueryKey(conversationId) },
  });

  const [inputValue, setInputValue] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, streamingContent]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;
    const content = inputValue.trim();
    setInputValue("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
              if (parsed.done) {
                setStreamingContent("");
                queryClient.invalidateQueries({
                  queryKey: getGetOpenaiConversationQueryKey(conversationId),
                });
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      }
    } catch {
      setStreamingContent("Sorry, the AI coach is unavailable. Please add your OPENAI_API_KEY to enable chat.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col p-4 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card/50">
        <h2 className="font-bold text-sm uppercase tracking-wider">{conversation?.title}</h2>
      </div>

      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto pb-4">
          {messages.length === 0 && !streamingContent && (
            <div className="text-center py-16">
              <Zap size={32} className="text-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-sm uppercase">
                Your AI coach is ready. Ask anything about your training.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.role}-${msg.id}`}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${
                  msg.role === "user"
                    ? "bg-secondary text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`max-w-[80%] p-4 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {streamingContent && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center">
                <Bot size={14} />
              </div>
              <div className="max-w-[80%] p-4 text-sm leading-relaxed bg-card border border-primary/30 text-foreground">
                {streamingContent}
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-1 align-middle" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            data-testid="input-message"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI coach anything..."
            className="flex-1 h-12 bg-secondary border-border font-mono focus-visible:ring-primary"
            disabled={isStreaming}
          />
          <Button
            data-testid="button-send"
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            className="h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90"
            size="icon"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Coach() {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const handleNewConversation = async () => {
    const now = new Date();
    const title = `Chat · ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    const conv = await createConversation.mutateAsync({ data: { title } });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    setActiveId(conv.id);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    if (activeId === id) {
      const remaining = (conversations ?? []).filter((c) => c.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border">
            <Button
              data-testid="button-new-chat"
              onClick={handleNewConversation}
              disabled={createConversation.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-xs"
            >
              <Plus size={14} className="mr-2" />
              {createConversation.isPending ? "Creating..." : "New Chat"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-muted-foreground uppercase">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  data-testid={`conversation-${conv.id}`}
                  onClick={() => setActiveId(conv.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/50 group ${
                    activeId === conv.id ? "bg-secondary border-l-2 border-l-primary" : ""
                  }`}
                >
                  <MessageSquare size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-mono flex-1 truncate">{conv.title}</span>
                  <button
                    data-testid={`button-delete-conv-${conv.id}`}
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeId ? (
            <ConversationView conversationId={activeId} />
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center p-8">
              <Zap size={48} className="text-primary" />
              <h2 className="text-2xl font-black uppercase tracking-tight">Your AI Coach</h2>
              <p className="text-muted-foreground max-w-sm font-mono text-sm">
                Ask about your progress, get training tips, or just talk through your goals.
              </p>
              <Button
                onClick={handleNewConversation}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider"
              >
                <Plus size={16} className="mr-2" /> Start a conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
