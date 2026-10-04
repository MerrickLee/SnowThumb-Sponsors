"use client";

import { useEffect } from "react";
import { identify, track } from "@/lib/analytics";

/** Links analytics to the signed-in account. Rendered by the admin and portal layouts. */
export function IdentifyUser({ userId, role, sponsorIds }: { userId: string; role: "admin" | "sponsor"; sponsorIds: string[] }) {
  const key = sponsorIds.join(",");
  useEffect(() => {
    const run = () => {
      identify(userId, role, key ? key.split(",") : []);
      // Once per browser session: the first console page after signing in.
      try {
        if (!sessionStorage.getItem("st_signed_in")) {
          sessionStorage.setItem("st_signed_in", "1");
          track("signin_completed", { role });
        }
      } catch { /* storage blocked */ }
    };
    run();
    window.addEventListener("st-consent", run);
    return () => window.removeEventListener("st-consent", run);
  }, [userId, role, key]);
  return null;
}
