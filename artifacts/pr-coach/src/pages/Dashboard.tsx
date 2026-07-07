import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAthlete,
  useGetRecordsSummary,
  useGetRecentRecords,
  useListGoals,
  useCreateGoal,
  useDeleteGoal,
  getListGoalsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, TrendingUp, Activity, Zap, ChevronRight, Plus, Trash2, Target } from "lucide-react";
import { Link } from "wouter";

// Mirror the same sports config for goal-setting dropdowns
const SPORTS_CATEGORIES: Record<string, string[]> = {
  Running: ["Mile", "5K", "10K", "Half Marathon", "Marathon"],
  Weightlifting: ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Power Clean"],
  Powerlifting: ["Squat", "Bench Press", "Deadlift", "Total"],
  Basketball: ["Vertical Jump", "Sprint Time", "Free Throw %", "3-Point %"],
  Swimming: ["50m Freestyle", "100m Freestyle", "200m Freestyle", "100m Backstroke", "100m Breaststroke"],
  Cycling: ["5K", "10K", "20K", "FTP"],
  Football: ["40-Yard Dash", "Vertical Jump", "Bench Press Reps", "Broad Jump"],
  Soccer: ["40m Sprint", "Vertical Jump", "Shot Speed"],
  "Track & Field": ["100m", "200m", "400m", "Long Jump", "High Jump", "Shot Put"],
  CrossFit: ["Fran", "Grace", "Cindy", "Max Pull-ups", "Max Push-ups"],
  Volleyball: ["Vertical Jump", "Serve Speed", "Block Reach"],
};

const SPORT_ICONS: Record<string, string> = {
  Running: "🏃", Weightlifting: "🏋️", Powerlifting: "💪", Basketball: "🏀",
  Swimming: "🏊", Cycling: "🚴", Football: "🏈", Soccer: "⚽",
  "Track & Field": "🏟️", CrossFit: "🔥", Volleyball: "🏐",
};

// Parse "min:sec" or plain numeric strings to a comparable number
function parseValue(val: string): number {
  if (val.includes(":")) {
    const [min, sec] = val.split(":").map(Number);
    return (min || 0) * 60 + (sec || 0);
  }
  return parseFloat(val) || 0;
}

// For time-based units: lower is better. For others: higher is better.
const TIME_UNITS = new Set(["min:sec", "sec"]);

function computeProgress(current: string, target: string, unit: string): number {
  const cur = parseValue(current);
  const tgt = parseValue(target);
  if (!tgt || !cur) return 0;
  if (TIME_UNITS.has(unit)) {
    // Lower is better: 100% when current ≤ target
    return Math.min(100, Math.round((tgt / cur) * 100));
  }
  return Math.min(100, Math.round((cur / tgt) * 100));
}

function StatCard({
  label, value, sub, icon: Icon,
}: {
  label: string; value: string | number; sub?: string; icon: typeof Trophy;
}) {
  return (
    <div className="p-6 border border-border bg-card hover:border-primary/40 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
        <Icon size={18} className="text-primary group-hover:scale-110 transition-transform" />
      </div>
      <div className="text-4xl font-black text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 font-mono">{sub}</div>}
    </div>
  );
}

function AddGoalDialog() {
  const queryClient = useQueryClient();
  const createGoal = useCreateGoal();
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState("Running");
  const [category, setCategory] = useState("Mile");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("min:sec");
  const [deadline, setDeadline] = useState("");

  const categories = SPORTS_CATEGORIES[sport] ?? [];

  const handleSportChange = (s: string) => {
    setSport(s);
    const cats = SPORTS_CATEGORIES[s] ?? [];
    setCategory(cats[0] ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim()) return;
    await createGoal.mutateAsync({
      data: {
        sport,
        category,
        targetValue: targetValue.trim(),
        unit: unit.trim(),
        deadline: deadline || null,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
    setTargetValue("");
    setDeadline("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-sm">
          <Plus size={16} /> Set Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-tight text-xl">
            🎯 Set a PR Goal
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Sport</Label>
              <Select value={sport} onValueChange={handleSportChange}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.keys(SPORTS_CATEGORIES).map((s) => (
                    <SelectItem key={s} value={s}>{SPORT_ICONS[s]} {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Target Value</Label>
              <Input
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 4:30"
                className="bg-secondary border-border font-mono focus-visible:ring-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Unit</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. min:sec"
                className="bg-secondary border-border font-mono focus-visible:ring-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Deadline (optional)
            </Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-secondary border-border font-mono focus-visible:ring-primary"
            />
          </div>

          <Button
            type="submit"
            disabled={createGoal.isPending}
            className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary/90"
          >
            {createGoal.isPending ? "Saving..." : "Save Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalsSection() {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useListGoals();
  const { data: summary } = useGetRecordsSummary();
  const deleteGoal = useDeleteGoal();

  const handleDelete = async (id: number) => {
    await deleteGoal.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
  };

  // Build a map of current PRs: sport+category → latestValue+unit
  const currentPRs: Record<string, { value: string; unit: string }> = {};
  for (const sport of summary?.sports ?? []) {
    for (const cat of sport.categories) {
      currentPRs[`${sport.sport}::${cat.category}`] = { value: cat.latestValue, unit: cat.unit };
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="border border-dashed border-border p-10 text-center">
        <Target size={28} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-mono text-sm uppercase">No goals set yet</p>
        <p className="text-xs text-muted-foreground mt-1">Set a target PR to track your progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const pr = currentPRs[`${goal.sport}::${goal.category}`];
        const progress = pr ? computeProgress(pr.value, goal.targetValue, goal.unit) : 0;
        const achieved = progress >= 100;

        return (
          <div
            key={goal.id}
            className={`border bg-card p-5 ${achieved ? "border-primary/60 bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{SPORT_ICONS[goal.sport] ?? "🎯"}</span>
                  <span className="font-black uppercase tracking-tight text-sm">
                    {goal.sport} — {goal.category}
                  </span>
                  {achieved && (
                    <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 uppercase">
                      ✓ Achieved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mb-3">
                  <span>
                    Target: <span className="text-foreground font-bold">{goal.targetValue} {goal.unit}</span>
                  </span>
                  {pr ? (
                    <span>
                      Current PR: <span className="text-primary font-bold">{pr.value} {pr.unit}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">No PR logged yet</span>
                  )}
                  {goal.deadline && (
                    <span>by {goal.deadline}</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-secondary h-2 relative overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${achieved ? "bg-primary" : "bg-primary/60"}`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs font-mono text-muted-foreground">0%</span>
                  <span className={`text-xs font-mono font-bold ${achieved ? "text-primary" : "text-muted-foreground"}`}>
                    {progress}%
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">100%</span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(goal.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: athlete, isLoading: athleteLoading } = useGetAthlete();
  const { data: summary, isLoading: summaryLoading } = useGetRecordsSummary();
  const { data: recent, isLoading: recentLoading } = useGetRecentRecords();

  useEffect(() => {
    if (!athleteLoading && !athlete) {
      setLocation("/onboarding");
    }
  }, [athlete, athleteLoading, setLocation]);

  if (athleteLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  const topSports = summary?.sports ?? [];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-10">
        {/* Greeting */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">
              Welcome back
            </p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              {athlete?.name ?? "Athlete"}
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {athlete?.sport} · {athlete?.experienceLevel}
            </p>
          </div>
          <Link href="/records">
            <button
              data-testid="button-log-pr"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm hover:bg-primary/90 transition-colors"
            >
              <Zap size={16} /> Log New PR
            </button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : (
            <>
              <StatCard label="Total PRs" value={summary?.totalPRs ?? 0} sub="All time" icon={Trophy} />
              <StatCard label="Sports" value={topSports.length} sub="Tracked categories" icon={Activity} />
              <StatCard
                label="Best Sport"
                value={topSports[0]?.sport ?? "—"}
                sub={`${topSports[0]?.count ?? 0} PRs`}
                icon={TrendingUp}
              />
              <StatCard label="Experience" value={athlete?.experienceLevel ?? "—"} icon={Zap} />
            </>
          )}
        </div>

        {/* Goals Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                PR Goals
              </h2>
            </div>
            <AddGoalDialog />
          </div>
          <GoalsSection />
        </div>

        {/* Sport Breakdown */}
        {topSports.length > 0 && (
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
              Sport Breakdown
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {topSports.map((sport) => (
                <div
                  key={sport.sport}
                  data-testid={`card-sport-${sport.sport}`}
                  className="border border-border bg-card p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black uppercase tracking-tight text-lg">
                      {SPORT_ICONS[sport.sport] ?? ""} {sport.sport}
                    </h3>
                    <span className="text-xs font-mono text-primary">{sport.count} PRs</span>
                  </div>
                  <div className="space-y-2">
                    {sport.categories.map((cat) => (
                      <div key={cat.category} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-mono text-xs uppercase">{cat.category}</span>
                        <span className="font-bold text-foreground">
                          {cat.latestValue} <span className="text-muted-foreground font-normal">{cat.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link href={`/records?sport=${sport.sport}`}>
                    <button className="mt-4 flex items-center gap-1 text-xs text-primary font-mono uppercase tracking-wide hover:gap-2 transition-all">
                      View history <ChevronRight size={12} />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent PRs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Recent PRs
            </h2>
            <Link href="/records">
              <span className="text-xs font-mono text-primary uppercase tracking-wide hover:underline cursor-pointer">
                View all
              </span>
            </Link>
          </div>

          {recentLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !recent || recent.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center">
              <Trophy size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-sm uppercase">No PRs logged yet</p>
              <Link href="/records">
                <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
                  Log Your First PR
                </button>
              </Link>
            </div>
          ) : (
            <div className="border border-border divide-y divide-border">
              {recent.map((rec) => (
                <div
                  key={rec.id}
                  data-testid={`row-record-${rec.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                >
                  <div>
                    <span className="font-bold text-foreground text-sm uppercase">{rec.category}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">· {rec.sport}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-primary text-lg">{rec.value}</span>
                    <span className="text-xs text-muted-foreground ml-1">{rec.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
