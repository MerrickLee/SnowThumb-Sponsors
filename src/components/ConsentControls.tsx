"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent, type Consent } from "@/lib/analytics";

export function ConsentControls() {
  const [c, setC] = useState<Consent>(null);
  useEffect(() => {
    const read = () => setC(getConsent());
    read();
    window.addEventListener("st-consent", read);
    return () => window.removeEventListener("st-consent", read);
  }, []);
  return (
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <p className="text-sm flex-1 min-w-48" aria-live="polite">
        Analytics is <strong>{c === "granted" ? "on" : "off"}</strong> in this browser.
      </p>
      {c === "granted"
        ? <button type="button" className="btn btn-sm" onClick={() => setConsent("denied")}>Turn off</button>
        : <button type="button" className="btn btn-sm btn-primary" onClick={() => setConsent("granted")}>Turn on</button>}
    </div>
  );
}
