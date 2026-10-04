"use client";

import { useEffect } from "react";
import { identify } from "@/lib/analytics";

/** Links analytics to the signed-in account. Rendered by the admin and portal layouts. */
export function IdentifyUser({ userId, role, sponsorIds }: { userId: string; role: "admin" | "sponsor"; sponsorIds: string[] }) {
  const key = sponsorIds.join(",");
  useEffect(() => {
    const run = () => identify(userId, role, key ? key.split(",") : []);
    run();
    window.addEventListener("st-consent", run);
    return () => window.removeEventListener("st-consent", run);
  }, [userId, role, key]);
  return null;
}
