import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Signed-out visitors (players tapping "Become a sponsor" in the game, links people
// share) land on the pitch page, not sign-in. Query strings (utm tags) carry over.
export default async function Home({ searchParams }: PageProps<"/">) {
  const s = await getSession();
  if (!s) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) {
      if (typeof v === "string") q.set(k, v);
      else if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    }
    const qs = q.toString();
    redirect(qs ? `/apply?${qs}` : "/apply");
  }
  redirect(s.isAdmin ? "/admin" : "/portal");
}
