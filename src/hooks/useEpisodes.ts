"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Episode } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Custom hook for managing episodes with Supabase Realtime subscriptions.
 * Falls back to polling if realtime isn't available.
 */
export function useEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const fetchEpisodes = useCallback(async () => {
    try {
      const res = await fetch("/api/episodes");
      if (res.ok) {
        const data = await res.json();
        setEpisodes(data);
      }
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEpisodes();

    let supabase: SupabaseClient;
    try {
      supabase = createBrowserClient();
      supabaseRef.current = supabase;
    } catch {
      // Supabase not configured — fall back to polling only
      const poll = setInterval(fetchEpisodes, 3000);
      return () => clearInterval(poll);
    }

    const channel = supabase
      .channel("episodes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "episodes" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEpisodes((prev) => [payload.new as Episode, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setEpisodes((prev) =>
              prev.map((ep) =>
                ep.id === (payload.new as Episode).id
                  ? (payload.new as Episode)
                  : ep
              )
            );
          } else if (payload.eventType === "DELETE") {
            setEpisodes((prev) =>
              prev.filter((ep) => ep.id !== (payload.old as Episode).id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn(
            "Realtime subscription failed, falling back to polling"
          );
          startPolling();
        }
      });

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(fetchEpisodes, 3000);
    }

    const safetyPoll = setInterval(() => {
      fetchEpisodes();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(safetyPoll);
    };
  }, [fetchEpisodes]);

  return { episodes, loading, refetch: fetchEpisodes };
}
