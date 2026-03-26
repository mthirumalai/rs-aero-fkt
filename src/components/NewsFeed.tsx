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

  function EventIcon({ type }: { type: "route_proposed" | "route_approved" | "fkt_attempt" }) {
    if (type === "route_proposed") {
      return (
        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
          <span className="text-yellow-600 font-bold text-sm">🗺️</span>
        </div>
      );
    }
    if (type === "route_approved") {
      return (
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-600 font-bold text-sm">📍</span>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <span className="text-blue-600 font-bold text-sm">🏆</span>
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
                  <td className="py-2 px-3 text-xs text-muted-foreground w-20 whitespace-nowrap">
                    {formatEventDate(event.date)}
                  </td>
                  <td className="py-2 px-2 w-12">
                    <EventIcon type={event.type} />
                  </td>
                  <td className="py-2 px-3 text-sm">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Link
                        href={`/routes/${event.data.routeId}`}
                        className="text-primary hover:underline text-sm"
                      >
                        {event.data.routeName}
                      </Link>
                      {event.type === "route_proposed" && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                          Proposed
                        </span>
                      )}
                      {event.type === "route_approved" && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Approved
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                    {event.type === "fkt_attempt"
                      ? event.data.sailorName
                      : event.data.submitterName}
                  </td>
                  <td className="py-2 px-3 w-20 text-center">
                    {event.type === "fkt_attempt" && event.data.rigSize && (
                      <RigIcon rigSize={event.data.rigSize as "AERO_5" | "AERO_6" | "AERO_7" | "AERO_9"} size={28} />
                    )}
                  </td>
                  <td className="py-2 px-3 w-24 text-center whitespace-nowrap">
                    {event.type === "fkt_attempt" && event.data.attemptId && event.data.durationSec && (
                      <Link
                        href={`/attempts/${event.data.attemptId}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
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