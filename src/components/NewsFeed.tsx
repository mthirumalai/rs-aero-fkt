"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COUNTRY_NAMES } from "@/lib/regions";
import { formatDuration } from "@/lib/gpx/parser";
import type { NewsEvent } from "@/app/api/news/route";

export function NewsFeed() {
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("Failed to fetch news");
        const data = await res.json();
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load news");
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  if (loading) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-display text-3xl uppercase tracking-wide mb-8 text-center">
            Latest Activity
          </h2>
          <div className="text-center text-muted-foreground">
            Loading news...
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-display text-3xl uppercase tracking-wide mb-8 text-center">
            Latest Activity
          </h2>
          <div className="text-center text-muted-foreground">
            Unable to load latest activity
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="font-display text-3xl uppercase tracking-wide mb-8 text-center">
            Latest Activity
          </h2>
          <div className="text-center text-muted-foreground">
            No recent activity
          </div>
        </div>
      </section>
    );
  }

  function formatEventDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  function EventIcon({ type }: { type: "route_approved" | "fkt_attempt" }) {
    if (type === "route_approved") {
      return (
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 font-bold text-lg">📍</span>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <span className="text-blue-600 font-bold text-lg">🏆</span>
      </div>
    );
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="font-display text-3xl uppercase tracking-wide mb-8 text-center">
          News Feed
        </h2>

        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <EventIcon type={event.type} />

                <div className="flex-1 min-w-0">
                  {event.type === "route_approved" ? (
                    <div>
                      <p className="text-lg font-medium">
                        New Route: <Link
                          href={`/routes/${event.data.routeId}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          {event.data.routeName}
                        </Link> by {event.data.submitterName}, {formatEventDate(event.date)} •
                        <Link href="/routes" className="text-primary hover:underline ml-1">
                          Submit FKT
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium">
                        New FKT: <Link
                          href={`/routes/${event.data.routeId}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          {event.data.routeName}
                        </Link> by <span className="font-bold">{event.data.sailorName}</span>, <span className="font-semibold text-blue-600">{event.data.rigSize?.replace('AERO_', 'Aero ')}</span> in {event.data.attemptId && event.data.durationSec ? (
                          <Link
                            href={`/attempts/${event.data.attemptId}`}
                            className="font-bold text-green-600 hover:underline"
                          >
                            {formatDuration(event.data.durationSec)}
                          </Link>
                        ) : (
                          <span className="font-bold text-green-600">
                            {event.data.durationSec && formatDuration(event.data.durationSec)}
                          </span>
                        )}, {formatEventDate(event.date)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/fkts"
            className="text-primary hover:underline font-medium"
          >
            View all FKT attempts →
          </Link>
        </div>
      </div>
    </section>
  );
}