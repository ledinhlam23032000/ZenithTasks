"use client";

import { useState } from "react";
import { Link2, LoaderCircle } from "lucide-react";
import { useFormAction } from "@/lib/use-form-action";
import { reconcileLegacyCollaborator, type CtvState } from "./actions";

export function ReconcileLegacyButton({ legacyName, profiles }: { legacyName: string; profiles: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useFormAction<CtvState>(reconcileLegacyCollaborator, () => setOpen(false));
  if (profiles.length === 0) return null;
  return (
    <div className="inline-flex items-center gap-1">
      {!open ? <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"><Link2 className="h-3.5 w-3.5" /> Gán ID</button> : <form action={run} className="inline-flex items-center gap-1">
        <input type="hidden" name="legacyName" value={legacyName} />
        <select name="collaboratorId" defaultValue="" required className="max-w-32 rounded-md border border-slate-200 px-1.5 py-1 text-xs"><option value="">Chọn CTV</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
        <button type="submit" disabled={pending} className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">{pending && <LoaderCircle className="h-3 w-3 animate-spin" />} Gán</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100">×</button>
      </form>}
      {state.error && <span className="text-[11px] text-rose-600">{state.error}</span>}
    </div>
  );
}
