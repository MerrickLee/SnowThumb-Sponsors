import type { Metadata } from "next";
import { Footer, Logo } from "@/components/Brand";
import { ConsentControls } from "@/components/ConsentControls";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <>
      <main id="main" className="flex-1 mx-auto max-w-2xl w-full px-4 py-10">
        <Logo height={28} href="/apply" />
        <h1 className="title text-4xl mt-8">Privacy</h1>
        <p className="text-muted mt-2">How sponsors.snowthumb.com uses data. Last updated October 3, 2026.</p>

        <section className="mt-8 space-y-3">
          <h2 className="title text-xl">What we collect</h2>
          <p>When you apply, we keep what you type into the form (company, contact name, email, website, interests, budget, logo) so we can reply and set up your sponsor account.</p>
          <p>When you sign in, we keep your email and the campaigns, art and settings you create, so the console works.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="title text-xl">Analytics</h2>
          <p>Only if you choose Accept, we use Google Analytics and Amplitude to see which pages are used, where visitors come from and where the sign-up steps get stuck. These tools set cookies and receive page addresses, device and browser type, and approximate location.</p>
          <p>We never send your name, email, company or uploaded files to them. Signed-in visits are linked by a random account ID only. We don&apos;t use them for ads, and we don&apos;t sell data.</p>
          <ConsentControls />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="title text-xl">In-game sponsor stats</h2>
          <p>Impressions, clicks and gear equips shown in the console come from the SnowThumb app. They count anonymous players and never identify a person.</p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="title text-xl">Questions or deletion</h2>
          <p>Email <a className="link" href="mailto:sponsors@snowthumb.com">sponsors@snowthumb.com</a> to see or delete what we hold about you.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
