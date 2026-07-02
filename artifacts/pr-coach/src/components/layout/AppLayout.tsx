import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetAthlete } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: athlete, isLoading } = useGetAthlete();

  const isPublicPage = location === "/" || location === "/onboarding";

  if (isLoading && !isPublicPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {!isPublicPage && (
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-black">
                PR
              </div>
              COACH
            </Link>
            
            <nav className="flex items-center gap-6 text-sm font-medium tracking-wide">
              <Link 
                href="/dashboard" 
                className={`transition-colors hover:text-primary ${location === "/dashboard" ? "text-primary border-b-2 border-primary h-16 flex items-center" : "text-muted-foreground"}`}
              >
                DASHBOARD
              </Link>
              <Link 
                href="/records" 
                className={`transition-colors hover:text-primary ${location.startsWith("/records") ? "text-primary border-b-2 border-primary h-16 flex items-center" : "text-muted-foreground"}`}
              >
                RECORDS
              </Link>
              {athlete?.onboardingComplete && (
                <Link 
                  href="/coach" 
                  className={`transition-colors hover:text-primary ${location.startsWith("/coach") ? "text-primary border-b-2 border-primary h-16 flex items-center" : "text-muted-foreground"}`}
                >
                  AI COACH
                </Link>
              )}
            </nav>
            
            <div className="hidden md:flex items-center gap-4">
              {athlete && (
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm">
                    <div className="font-bold text-foreground">{athlete.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{athlete.sport}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-lg border border-border">
                    {athlete.name?.charAt(0).toUpperCase() || "A"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
