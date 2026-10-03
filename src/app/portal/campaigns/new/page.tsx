import type { Metadata } from "next";
import { requireSponsor } from "@/lib/auth";
import { PageHeader } from "@/components/Shell";
import { CampaignForm } from "@/components/CampaignForm";
import { createCampaign } from "@/app/portal/actions";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaign() {
  const s = await requireSponsor();
  const sponsors = s.sponsors.filter((x) => x.active);
  return (
    <>
      <PageHeader eyebrow="Step 1 of 3" title="New campaign" sub="Start with the basics. You'll upload art on the next screen." />
      <CampaignForm action={createCampaign} sponsors={sponsors} />
    </>
  );
}
