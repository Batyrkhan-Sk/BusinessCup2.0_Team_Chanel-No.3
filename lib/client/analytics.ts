"use client";
/** Product analytics: the five spec events, sent to /api/events (stored when DATABASE_URL is set). */
import { store } from "./store";

export type AnalyticsEvent = "quiz_start" | "result_view" | "paywall_view" | "checkout_start" | "reminder_set";

export function track(name: AnalyticsEvent, props: Record<string, string | number | boolean | null> = {}): void {
  try {
    const body = JSON.stringify({ name, props, session_id: store.sessionId(), at: new Date().toISOString() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    else void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  } catch {
    /* analytics must never break the flow */
  }
}
