import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRecords,
  useCreateRecord,
  useDeleteRecord,
  useGetRecordHistory,
  getListRecordsQueryKey,
  getGetRecordHistoryQueryKey,
  getGetRecordsSummaryQueryKey,
  getGetRecentRecordsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, TrendingUp, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type SportConfig = {
  icon: string;
  categories: string[];
  unit: string | Record<string, string>;
  placeholder: string | Record<string, string>;
};

const SPORTS_CONFIG: Record<string, SportConfig> = {
  Running: {
    icon: "🏃",
    categories: ["Mile", "5K", "10K", "Half Marathon", "Marathon"],
    unit: "min:sec",
    placeholder: "e.g. 5:32",
  },
  Weightlifting: {
    icon: "🏋️",
    categories: ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Power Clean"],
    unit: "lbs",
    placeholder: "e.g. 225",
  },
  Powerlifting: {
    icon: "💪",
    categories: ["Squat", "Bench Press", "Deadlift", "Total"],
    unit: "lbs",
    placeholder: "e.g. 315",
  },
  Basketball: {
    icon: "🏀",
    categories: ["Vertical Jump", "Sprint Time", "Free Throw %", "3-Point %"],
    unit: { "Vertical Jump": "inches", "Sprint Time": "sec", "Free Throw %": "%", "3-Point %": "%" },
    placeholder: { "Vertical Jump": "e.g. 30", "Sprint Time": "e.g. 3.8", "Free Throw %": "e.g. 85", "3-Point %": "e.g. 40" },
  },
  Swimming: {
    icon: "🏊",
    categories: ["50m Freestyle", "100m Freestyle", "200m Freestyle", "100m Backstroke", "100m Breaststroke"],
    unit: "min:sec",
    placeholder: "e.g. 0:58",
  },
  Cycling: {
    icon: "🚴",
    categories: ["5K", "10K", "20K", "FTP"],
    unit: { "5K": "min:sec", "10K": "min:sec", "20K": "min:sec", "FTP": "watts" },
    placeholder: { "5K": "e.g. 8:30", "10K": "e.g. 17:45", "20K": "e.g. 36:00", "FTP": "e.g. 250" },
  },
  Football: {
    icon: "🏈",
    categories: ["40-Yard Dash", "Vertical Jump", "Bench Press Reps", "Broad Jump"],
    unit: { "40-Yard Dash": "sec", "Vertical Jump": "inches", "Bench Press Reps": "reps", "Broad Jump": "inches" },
    placeholder: { "40-Yard Dash": "e.g. 4.5", "Vertical Jump": "e.g. 36", "Bench Press Reps": "e.g. 25", "Broad Jump": "e.g. 120" },
  },
  Soccer: {
    icon: "⚽",
    categories: ["40m Sprint", "Vertical Jump", "Shot Speed"],
    unit: { "40m Sprint": "sec", "Vertical Jump": "inches", "Shot Speed": "mph" },
    placeholder: { "40m Sprint": "e.g. 4.9", "Vertical Jump": "e.g. 28", "Shot Speed": "e.g. 65" },
  },
  "Track & Field": {
    icon: "🏟️",
    categories: ["100m", "200m", "400m", "Long Jump", "High Jump", "Shot Put"],
    unit: { "100m": "sec", "200m": "sec", "400m": "sec", "Long Jump": "m", "High Jump": "m", "Shot Put": "m" },
    placeholder: { "100m": "e.g. 10.8", "200m": "e.g. 21.5", "400m": "e.g. 48.2", "Long Jump": "e.g. 6.5", "High Jump": "e.g. 1.85", "Shot Put": "e.g. 12.5" },
  },
  CrossFit: {
    icon: "🔥",
    categories: ["Fran", "Grace", "Cindy", "Max Pull-ups", "Max Push-ups"],
    unit: { "Fran": "min:sec", "Grace": "min:sec", "Cindy": "rounds", "Max Pull-ups": "reps", "Max Push-ups": "reps" },
    placeholder: { "Fran": "e.g. 4:30", "Grace": "e.g. 3:45", "Cindy": "e.g. 18", "Max Pull-ups": "e.g. 25", "Max Push-ups": "e.g. 60" },
  },
  Volleyball: {
    icon: "🏐",
    categories: ["Vertical Jump", "Serve Speed", "Block Reach"],
    unit: { "Vertical Jump": "inches", "Serve Speed": "mph", "Block Reach": "inches" },
    placeholder: { "Vertical Jump": "e.g. 32", "Serve Speed": "e.g. 55", "Block Reach": "e.g. 102" },
  },
};

function getUnit(sport: string, category: string): string {
  const config = SPORTS_CONFIG[sport];
  if (!config) return "units";
  if (typeof config.unit === "string") return config.unit;
  return config.unit[category] ?? "units";
}

function getPlaceholder(sport: string, category: string): string {
  const config = SPORTS_CONFIG[sport];
  if (!config) return "";
  if (typeof config.placeholder === "string") return config.placeholder;
  return config.placeholder[category] ?? "";
}

function RecordHistoryChart({ sport, category }: { sport: string; category: string }) {
  const { data: history, isLoading } = useGetRecordHistory(sport, category, {
    query: { queryKey: getGetRecordHistoryQueryKey(sport, category) },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!history || history.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center border border-dashed border-border text-xs font-mono text-muted-foreground uppercase">
        Log 2+ PRs to see your trend
      </div>
    );
  }

  const chartData = [...history]
    .reverse()
    .map((r) => ({
      date: format(new Date(r.achievedAt), "MM/dd"),
      value: parseFloat(r.value) || 0,
    }));

  return (
    <ResponsiveContainer width="100%" height={100}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 15%)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(240 5% 65%)", fontFamily: "Space Mono" }} />
        <YAxis tick={{ fontSize: 9, fill: "hsl(240 5% 65%)", fontFamily: "Space Mono" }} />
        <Tooltip
          contentStyle={{
            background: "hsl(240 10% 6%)",
            border: "1px solid hsl(240 5% 15%)",
            borderRadius: 0,
            fontSize: 11,
            fontFamily: "Space Mono",
          }}
        />
        <Line type="monotone" dataKey="value" stroke="hsl(110 100% 54%)" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CategorySection({ sport, category, unit }: { sport: string; category: string; unit: string }) {
  const queryClient = useQueryClient();
  const { data: records, isLoading } = useListRecords(
    { sport, category },
    { query: { queryKey: getListRecordsQueryKey({ sport, category }) } }
  );
  const deleteRecord = useDeleteRecord();

  const handleDelete = async (id: number) => {
    await deleteRecord.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey({ sport, category }) });
    queryClient.invalidateQueries({ queryKey: getGetRecordsSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentRecordsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecordHistoryQueryKey(sport, category) });
  };

  const best = records && records.length > 0 ? records[0] : null;

  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-3">
          <h3 className="font-black uppercase tracking-tight text-sm">{category}</h3>
          {best && (
            <span className="text-xs font-mono text-primary">
              PR: {best.value} {best.unit}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">{unit}</span>
      </div>

      <div className="p-4">
        <RecordHistoryChart sport={sport} category={category} />
      </div>

      <div className="divide-y divide-border max-h-48 overflow-y-auto">
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 mx-4 my-1" />)
        ) : !records || records.length === 0 ? (
          <div className="px-5 py-4 text-xs font-mono text-muted-foreground uppercase text-center">
            No records yet — log your first PR!
          </div>
        ) : (
          records.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between px-5 py-2.5 hover:bg-secondary/20 transition-colors"
            >
              <div>
                <span className="font-black text-primary">{rec.value}</span>
                <span className="text-xs text-muted-foreground ml-1">{rec.unit}</span>
                {rec.notes && (
                  <span className="text-xs text-muted-foreground ml-2 font-mono">· {rec.notes}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">
                  {format(new Date(rec.achievedAt), "MMM d, yyyy")}
                </span>
                <button
                  onClick={() => handleDelete(rec.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LogPRDialog({ sport }: { sport: string }) {
  const queryClient = useQueryClient();
  const createRecord = useCreateRecord();
  const config = SPORTS_CONFIG[sport];

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(config?.categories[0] ?? "");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [achievedAt, setAchievedAt] = useState(new Date().toISOString().slice(0, 10));

  const unit = getUnit(sport, category);
  const placeholder = getPlaceholder(sport, category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    await createRecord.mutateAsync({
      data: {
        sport,
        category,
        value: value.trim(),
        unit,
        notes: notes.trim() || null,
        achievedAt: new Date(achievedAt).toISOString(),
      },
    });
    queryClient.invalidateQueries({ queryKey: getListRecordsQueryKey({ sport, category }) });
    queryClient.invalidateQueries({ queryKey: getGetRecordsSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentRecordsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecordHistoryQueryKey(sport, category) });
    setValue("");
    setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="button-log-pr"
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-sm"
        >
          <Plus size={16} /> Log PR
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-tight text-xl">
            {SPORTS_CONFIG[sport]?.icon} Log {sport} PR
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category" className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {config?.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Value ({unit})
            </Label>
            <Input
              data-testid="input-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="bg-secondary border-border font-mono focus-visible:ring-primary"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Date Achieved</Label>
            <Input
              data-testid="input-date"
              type="date"
              value={achievedAt}
              onChange={(e) => setAchievedAt(e.target.value)}
              className="bg-secondary border-border font-mono focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Notes (optional)</Label>
            <Input
              data-testid="input-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context about this PR..."
              className="bg-secondary border-border focus-visible:ring-primary"
            />
          </div>

          <Button
            type="submit"
            disabled={createRecord.isPending}
            className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary/90"
          >
            {createRecord.isPending ? "Saving..." : "Save PR"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Records() {
  const [activeSport, setActiveSport] = useState("Running");
  const config = SPORTS_CONFIG[activeSport];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6 mb-8">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">
              <TrendingUp size={12} className="inline mr-1" />
              Personal Records
            </p>
            <h1 className="text-4xl font-black uppercase tracking-tight">Your PRs</h1>
          </div>
          <LogPRDialog sport={activeSport} />
        </div>

        <div className="flex gap-6">
          {/* Sport sidebar */}
          <aside className="w-48 shrink-0 hidden md:block">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 px-1">Sport</p>
            <nav className="space-y-0.5">
              {Object.entries(SPORTS_CONFIG).map(([sport, cfg]) => (
                <button
                  key={sport}
                  onClick={() => setActiveSport(sport)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors text-sm font-medium ${
                    activeSport === sport
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cfg.icon}</span>
                    <span className="font-mono text-xs uppercase tracking-wide">{sport}</span>
                  </span>
                  {activeSport === sport && <ChevronRight size={14} />}
                </button>
              ))}
            </nav>
          </aside>

          {/* Mobile sport selector */}
          <div className="md:hidden w-full mb-4 -mt-4">
            <Select value={activeSport} onValueChange={setActiveSport}>
              <SelectTrigger className="bg-secondary border-border font-mono uppercase text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {Object.entries(SPORTS_CONFIG).map(([sport, cfg]) => (
                  <SelectItem key={sport} value={sport}>
                    {cfg.icon} {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categories panel */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{config.icon}</span>
              <h2 className="text-2xl font-black uppercase tracking-tight">{activeSport}</h2>
              <span className="text-xs font-mono text-muted-foreground border border-border px-2 py-1 uppercase">
                {config.categories.length} categories
              </span>
            </div>
            {config.categories.map((cat) => (
              <CategorySection
                key={`${activeSport}-${cat}`}
                sport={activeSport}
                category={cat}
                unit={getUnit(activeSport, cat)}
              />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
