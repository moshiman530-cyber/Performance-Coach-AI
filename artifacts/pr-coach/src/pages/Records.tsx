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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const SPORTS_CONFIG = {
  Running: {
    categories: ["Mile", "5K", "10K"],
    unit: "min:sec",
    placeholder: "e.g. 5:32",
  },
  Weightlifting: {
    categories: ["Bench Press", "Squat", "Deadlift"],
    unit: "lbs",
    placeholder: "e.g. 225",
  },
  Basketball: {
    categories: ["Vertical Jump", "Sprint Time"],
    unit: { "Vertical Jump": "inches", "Sprint Time": "seconds" } as Record<string, string>,
    placeholder: "e.g. 28",
  },
} as const;

type Sport = keyof typeof SPORTS_CONFIG;

function RecordHistoryChart({ sport, category }: { sport: string; category: string }) {
  const { data: history, isLoading } = useGetRecordHistory(sport, category, {
    query: { queryKey: getGetRecordHistoryQueryKey(sport, category) },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!history || history.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center border border-dashed border-border text-xs font-mono text-muted-foreground uppercase">
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
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 15%)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 65%)", fontFamily: "Space Mono" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 65%)", fontFamily: "Space Mono" }} />
        <Tooltip
          contentStyle={{
            background: "hsl(240 10% 6%)",
            border: "1px solid hsl(240 5% 15%)",
            borderRadius: 0,
            fontSize: 12,
            fontFamily: "Space Mono",
          }}
        />
        <Line type="monotone" dataKey="value" stroke="hsl(110 100% 54%)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CategorySection({
  sport,
  category,
  unit,
}: {
  sport: string;
  category: string;
  unit: string;
}) {
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

  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-black uppercase tracking-tight text-sm">{category}</h3>
        <span className="text-xs font-mono text-muted-foreground">{unit}</span>
      </div>

      <div className="p-4">
        <RecordHistoryChart sport={sport} category={category} />
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 mx-4 my-2" />)
        ) : !records || records.length === 0 ? (
          <div className="px-6 py-6 text-xs font-mono text-muted-foreground uppercase text-center">
            No records yet
          </div>
        ) : (
          records.map((rec) => (
            <div
              key={rec.id}
              data-testid={`row-record-${rec.id}`}
              className="flex items-center justify-between px-6 py-3 hover:bg-secondary/20 transition-colors"
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
                  data-testid={`button-delete-${rec.id}`}
                  onClick={() => handleDelete(rec.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LogPRDialog({ sport }: { sport: Sport }) {
  const queryClient = useQueryClient();
  const createRecord = useCreateRecord();
  const config = SPORTS_CONFIG[sport];

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(config.categories[0]);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [achievedAt, setAchievedAt] = useState(new Date().toISOString().slice(0, 10));

  const getUnit = (): string => {
    if (sport === "Basketball") {
      return (SPORTS_CONFIG.Basketball.unit as Record<string, string>)[category] ?? "units";
    }
    return config.unit as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    await createRecord.mutateAsync({
      data: {
        sport,
        category,
        value: value.trim(),
        unit: getUnit(),
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
            Log {sport} PR
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger data-testid="select-category" className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {config.categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Value ({getUnit()})
            </Label>
            <Input
              data-testid="input-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.placeholder}
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
  const [activeSport, setActiveSport] = useState<Sport>("Running");
  const config = SPORTS_CONFIG[activeSport];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8">
          <div>
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-1">
              <TrendingUp size={12} className="inline mr-1" />
              Personal Records
            </p>
            <h1 className="text-4xl font-black uppercase tracking-tight">Your PRs</h1>
          </div>
          <LogPRDialog sport={activeSport} />
        </div>

        <Tabs value={activeSport} onValueChange={(v) => setActiveSport(v as Sport)}>
          <TabsList className="bg-card border border-border h-auto p-0 gap-0">
            {(Object.keys(SPORTS_CONFIG) as Sport[]).map((s) => (
              <TabsTrigger
                key={s}
                value={s}
                data-testid={`tab-${s.toLowerCase()}`}
                className="px-6 py-3 font-mono uppercase text-xs tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none border-r border-border last:border-r-0"
              >
                {s}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(SPORTS_CONFIG) as Sport[]).map((sport) => (
            <TabsContent key={sport} value={sport} className="mt-6 space-y-4">
              {SPORTS_CONFIG[sport].categories.map((cat) => {
                const unit: string =
                  sport === "Basketball"
                    ? ((SPORTS_CONFIG.Basketball.unit as Record<string, string>)[cat] ?? "units")
                    : (SPORTS_CONFIG[sport].unit as string);
                return (
                  <CategorySection key={cat} sport={sport} category={cat} unit={unit} />
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
