"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { heartbeatInboxPresence } from "./inbox-actions";

export function InboxPoller({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    const refresh = () => { if (!stopped && document.visibilityState === "visible") router.refresh(); };
    const heartbeat = () => {
      if (!conversationId || document.visibilityState !== "visible") return;
      const data = new FormData(); data.set("conversationId", conversationId); data.set("isTyping", "false");
      void heartbeatInboxPresence(data).catch(() => undefined);
    };
    const tick = () => { refresh(); heartbeat(); };
    const interval = window.setInterval(tick, 5_000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    const onFocus = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    heartbeat();
    return () => { stopped = true; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onFocus); };
  }, [conversationId, router]);
  return null;
}
