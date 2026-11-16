"use client";
import { useState } from "react";

export function RestoreButton({ label, confirmText }: { label: string; confirmText: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <label className="btn w-full cursor-pointer">
        {label}
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f || !confirm(confirmText)) return;
            setMsg("…");
            const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: await f.text() });
            const j = await res.json().catch(() => ({ ok: false }));
            setMsg(j.ok ? "✓" : `✗ ${j.error ?? ""}`);
            if (j.ok) location.href = "/";
          }}
        />
      </label>
      {msg && <p className="mt-2 text-center text-sm">{msg}</p>}
    </div>
  );
}
