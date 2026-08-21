"use client";

import { sanitizeUxTelemetry, telemetryStorageKey, type UxTelemetryEvent, type UxTelemetryPayload } from "./ux-telemetry";

const SESSION_KEY = "ux-telemetry-session";

type StoredEvent = { event: UxTelemetryEvent; payload: UxTelemetryPayload; at: string };

export function startUxWorkflow(workflow: string, surface: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${SESSION_KEY}:${workflow}`, JSON.stringify({ startedAt: Date.now(), stepCount: 0, surface }));
  recordUxEvent("workflow_start", { workflow, surface });
}

export function recordUxEvent(event: UxTelemetryEvent, payload: UxTelemetryPayload): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeUxTelemetry(payload);
  const key = telemetryStorageKey(event);
  const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as StoredEvent[];
  current.push({ event, payload: safe, at: new Date().toISOString() });
  window.localStorage.setItem(key, JSON.stringify(current.slice(-200)));
}

export function completeUxWorkflow(workflow: string, step: string): void {
  if (typeof window === "undefined") return;
  const raw = window.sessionStorage.getItem(`${SESSION_KEY}:${workflow}`);
  const started = raw ? JSON.parse(raw) as { startedAt?: number; stepCount?: number; surface?: string } : {};
  recordUxEvent("workflow_complete", { workflow, step, durationMs: started.startedAt ? Date.now() - started.startedAt : undefined, stepCount: started.stepCount ?? 0, surface: started.surface });
  window.sessionStorage.removeItem(`${SESSION_KEY}:${workflow}`);
}
