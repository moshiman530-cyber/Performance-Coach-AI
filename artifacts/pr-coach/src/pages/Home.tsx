import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetAthlete } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, TrendingUp, Trophy, Zap } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: athlete, isLoading } = useGetAthlete();

  useEffect(() => {
    if (athlete?.onboardingComplete) {
      setLocation("/dashboard");
    }
  }, [athlete, setLocation]);

  return (
    <div className="flex-1 bg-background">
      <header className="absolute top-0 w-full z-50 p-6 flex justify-between items-center">
        <div className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-black">
            PR
          </div>
          COACH
        </div>
        <div className="flex gap-4">
          <Link href="/onboarding">
            <Button variant="outline" className="font-mono uppercase tracking-wider text-xs">
              Log In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        
        <div className="container relative z-10 px-4 pt-20 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono mb-8 uppercase tracking-widest">
            <Zap size={14} /> The AI Coach That Never Sleeps
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-foreground mb-6 leading-none">
            Beat Your <span className="text-primary block md:inline">Numbers.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 font-light tracking-wide">
            The obsessive tracker for athletes who want to push further, lift heavier, and run faster. Your personal AI coach is waiting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/onboarding">
              <Button size="lg" className="h-16 px-8 text-lg font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto group">
                Start Tracking <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-16 px-8 text-lg font-bold uppercase tracking-wider w-full sm:w-auto border-border hover:bg-secondary">
              View Features
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-card relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="p-8 border border-border bg-background hover:border-primary/50 transition-colors group">
              <Activity className="h-12 w-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold uppercase mb-4">Relentless Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Log every mile, every rep, every jump. See your history visualized in stark, beautiful data.
              </p>
            </div>
            <div className="p-8 border border-border bg-background hover:border-primary/50 transition-colors group">
              <TrendingUp className="h-12 w-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold uppercase mb-4">Data-Driven Insights</h3>
              <p className="text-muted-foreground leading-relaxed">
                Stop guessing. Know exactly where you plateau and when you peak with comprehensive charts.
              </p>
            </div>
            <div className="p-8 border border-border bg-background hover:border-primary/50 transition-colors group">
              <Trophy className="h-12 w-12 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold uppercase mb-4">Personal AI Coach</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get custom training advice based on your real PR history. A coach that knows your numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase mb-8">Ready to break<br/>your limits?</h2>
          <Link href="/onboarding">
            <Button size="lg" className="h-20 px-12 text-2xl font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90">
              Enter The Gym
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
