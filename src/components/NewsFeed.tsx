"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDuration } from "@/lib/gpx/parser";
import type { NewsEvent } from "@/app/api/news/route";
import { RigIcon } from "@/components/RigIcon";

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
          New FKTs and Routes
        </h2>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b last:border-b-0">
                  <td className="py-4 px-4 text-sm text-muted-foreground w-20">
                    {formatEventDate(event.date)}
                  </td>
                  <td className="py-4 px-3 w-12 text-sm">
                    <EventIcon type={event.type} />
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <Link
                      href={`/routes/${event.data.routeId}`}
                      className="text-primary hover:underline"
                    >
                      {event.data.routeName}
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {event.type === "route_approved"
                      ? event.data.submitterName
                      : event.data.sailorName}
                  </td>
                  <td className="py-4 px-4 w-20 text-sm">
                    {event.type === "fkt_attempt" && event.data.rigSize && (
                      <RigIcon rigSize={event.data.rigSize as "AERO_5" | "AERO_6" | "AERO_7" | "AERO_9"} size={32} />
                    )}
                  </td>
                  <td className="py-4 px-4 w-24 text-sm">
                    {event.type === "fkt_attempt" && event.data.attemptId && event.data.durationSec && (
                      <Link
                        href={`/attempts/${event.data.attemptId}`}
                        className="text-green-600 hover:underline"
                      >
                        {formatDuration(event.data.durationSec)}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-8 space-x-4">
          <Link
            href="/fkts"
            className="text-primary hover:underline font-medium"
          >
            FKTs
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link
            href="/routes"
            className="text-primary hover:underline font-medium"
          >
            Routes
          </Link>
        </div>
      </div>
    </section>
  );
}