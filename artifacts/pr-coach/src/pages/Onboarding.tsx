import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useUpsertAthlete } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Zap } from "lucide-react";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const QUESTIONS = [
  "Hey! I'm your PR Coach. What's your name?",
  "Nice to meet you! How old are you? (You can skip this if you prefer)",
  "Got it. What's your height? (optional)",
  "And your weight? (optional)",
  "What's your main sport? (Running, Weightlifting, or Basketball)",
  "How would you describe your experience level? (Beginner, Intermediate, or Advanced)",
  "Tell me about your current personal records — what are your best numbers right now?",
  "How many days a week do you train, and what does a typical week look like?",
  "Last one — what are your main goals? What do you want to achieve?",
  "Here's your profile summary. Looking great! Let's start tracking your PRs."
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: QUESTIONS[0] }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const upsertAthlete = useUpsertAthlete();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() && currentQuestionIndex !== 9) return;

    const userMessage = inputValue.trim() || "Skipped";
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInputValue("");

    const newAnswers = { ...answers, [String(currentQuestionIndex)]: userMessage };
    setAnswers(newAnswers);

    const nextIndex = currentQuestionIndex + 1;
    
    setTimeout(() => {
      if (nextIndex < QUESTIONS.length) {
        let nextQuestion = QUESTIONS[nextIndex];
        
        // Personalize the age question
        if (nextIndex === 1) {
          nextQuestion = `Nice to meet you, ${userMessage}! How old are you? (You can skip this if you prefer)`;
        }
        
        // Final summary question
        if (nextIndex === QUESTIONS.length - 1) {
          const summary = `${newAnswers["0"]} - ${newAnswers["4"]} - ${newAnswers["5"]}`;
          nextQuestion = `Here's your profile: ${summary}. Looking great! Let's start tracking your PRs.`;
        }

        setMessages(prev => [...prev, { role: "assistant", content: nextQuestion }]);
        setCurrentQuestionIndex(nextIndex);
      } else {
        // Complete onboarding
        saveProfile(newAnswers);
      }
    }, 600);
  };

  const saveProfile = async (finalAnswers: Record<string, string>) => {
    try {
      const ageStr = finalAnswers["1"];
      const age = !isNaN(parseInt(ageStr)) ? parseInt(ageStr) : null;

      await upsertAthlete.mutateAsync({
        data: {
          name: finalAnswers["0"] || "Athlete",
          age: age,
          height: finalAnswers["2"] === "Skipped" ? null : finalAnswers["2"],
          weight: finalAnswers["3"] === "Skipped" ? null : finalAnswers["3"],
          sport: finalAnswers["4"] || "General Fitness",
          experienceLevel: finalAnswers["5"] || "Intermediate",
          weeklySchedule: finalAnswers["7"] === "Skipped" ? null : finalAnswers["7"],
          goals: finalAnswers["8"] === "Skipped" ? null : finalAnswers["8"],
          onboardingComplete: true
        }
      });
      setLocation("/dashboard");
    } catch (err) {
      console.error("Failed to save profile", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isComplete = currentQuestionIndex >= QUESTIONS.length - 1;

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full p-4 md:p-8 h-[calc(100vh-4rem)]">
      <div className="mb-8 text-center mt-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground font-black text-2xl mb-4 shadow-[0_0_30px_rgba(57,255,20,0.3)]">
          <Zap size={32} />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Meet Your Coach</h1>
        <p className="text-muted-foreground mt-2 font-mono text-sm">INITIALIZING ATHLETE PROFILE...</p>
      </div>

      <div className="flex-1 bg-card border border-border flex flex-col overflow-hidden relative shadow-2xl">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6 pb-20">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[80%] p-4 text-sm md:text-base ${
                    msg.role === "user" 
                      ? "bg-secondary text-secondary-foreground" 
                      : "bg-primary text-primary-foreground font-medium"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border">
          {isComplete ? (
            <Button 
              className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary text-primary-foreground"
              onClick={() => saveProfile(answers)}
              disabled={upsertAthlete.isPending}
            >
              {upsertAthlete.isPending ? "SAVING..." : "GO TO DASHBOARD"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer... (or leave blank to skip optional)"
                className="flex-1 h-14 bg-secondary border-border focus-visible:ring-primary font-mono"
                autoFocus
              />
              <Button 
                onClick={handleSend}
                size="icon"
                className="h-14 w-14 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
