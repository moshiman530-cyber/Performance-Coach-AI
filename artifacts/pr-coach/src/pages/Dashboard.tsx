import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetAthlete,
  useGetRecordsSummary,
  useGetRecentRecords,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Activity, Zap, ChevronRight } from "lucide-react";
import { Link } from "wouter";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Trophy;
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
              <StatCard
                label="Total PRs"
                value={summary?.totalPRs ?? 0}
                sub="All time"
                icon={Trophy}
              />
              <StatCard
                label="Sports"
                value={topSports.length}
                sub="Tracked categories"
                icon={Activity}
              />
              <StatCard
                label="Best Sport"
                value={topSports[0]?.sport ?? "—"}
                sub={`${topSports[0]?.count ?? 0} PRs`}
                icon={TrendingUp}
              />
              <StatCard
                label="Experience"
                value={athlete?.experienceLevel ?? "—"}
                icon={Zap}
              />
            </>
          )}
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
                    <h3 className="font-black uppercase tracking-tight text-lg">{sport.sport}</h3>
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

        {/* Goals */}
        {athlete?.goals && (
          <div className="border border-primary/20 bg-primary/5 p-6">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">Your Goals</p>
            <p className="text-foreground font-medium leading-relaxed">{athlete.goals}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
