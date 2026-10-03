import { requireSponsor } from "@/lib/auth";
import { PageHeader } from "@/components/Shell";
import { CampaignForm } from "@/components/CampaignForm";
import { createCampaign } from "@/app/portal/actions";

export default async function NewCampaign() {
  const s = await requireSponsor();
  const sponsors = s.sponsors.filter((x) => x.active);
  return (
    <>
      <PageHeader title="New campaign" sub="Start with the basics. You'll pick placements and upload art on the next screen." />
      <CampaignForm action={createCampaign} sponsors={sponsors} />
    </>
  );
}
