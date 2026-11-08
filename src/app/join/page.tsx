import type { Metadata } from "next";
import Image from "next/image";
import { Footer, Logo } from "@/components/Brand";
import { PreviewInGame } from "@/components/PreviewInGame";
import { SponsorApplyForm } from "@/components/SponsorApplyForm";
import { TrackOnView } from "@/components/Track";

export const metadata: Metadata = {
  title: "Put your brand in SnowThumb",
  description: "See your brand in the park, then send a short sponsorship inquiry. No account needed.",
};

export default function Join() {
  return <>
    <header className="border-b border-line bg-surface"><div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
      <Logo height={24} href="https://snowthumb.com" />
      <a className="btn btn-primary btn-sm" href="#inquire">Let&apos;s talk</a>
    </div></header>
    <main id="main" className="flex-1 mx-auto max-w-5xl w-full px-4 py-8 md:py-14">
      <section className="grid md:grid-cols-2 gap-7 md:gap-12 items-center">
        <div><p className="eyebrow text-accent">From the park to your brand</p>
          <h1 className="title text-4xl md:text-6xl mt-3">Put your brand in SnowThumb.</h1>
          <p className="text-muted mt-5 text-lg">A board riders choose. Banners they pass. Features they come back to ride. Make your brand part of the park.</p>
          <a href="#inquire" className="btn btn-primary mt-6">Send a short inquiry</a>
          <p className="text-sm text-muted mt-3">No account or payment needed to ask.</p>
        </div>
        <figure className="card overflow-hidden"><Image src="/brand/board-room.jpg" alt="A Croes Ave branded board in SnowThumb" width={600} height={1299} className="w-full h-[440px] object-cover object-center" priority /><figcaption className="text-sm text-muted p-3">An example of a branded board in the game.</figcaption></figure>
      </section>
      <section className="mt-10 grid sm:grid-cols-3 gap-4" aria-label="Ways to join the park">
        {[ ["Boards & gear", "Put your artwork on gear players can unlock and equip."], ["Park placements", "Bring your brand to banners, rails, boxes and kickers."], ["A personal review", "Tell us your idea. We’ll help choose a fit and review the artwork before it goes live."] ].map(([title, body]) => <div className="card p-5" key={title}><h2 className="title text-xl">{title}</h2><p className="text-muted mt-2">{body}</p></div>)}
      </section>
      <section className="mt-10 card p-6" aria-label="Sponsorship preview"><h2 className="title text-2xl mb-4">See the possibilities</h2><PreviewInGame art={{}} views={["board", "wall", "rail"]} label="Preview boards, banners & features" className="btn btn-primary" /><p className="text-sm text-muted mt-3">Interactive placement mockups. Final artwork and placement are reviewed with you.</p></section>
      <section id="inquire" className="mt-12 scroll-mt-5 max-w-2xl mx-auto">
        <h2 className="title text-3xl">Let&apos;s make something riders remember.</h2>
        <p className="text-muted mt-3 mb-5">Your company, your name and a reply email are all we need to start. Add an idea if you have one.</p>
        <TrackOnView event="sponsor_inquiry_form_viewed" props={{ flow: "game_invitation" }}><SponsorApplyForm compact /></TrackOnView>
      </section>
      <p className="text-center text-sm text-muted mt-7"><a className="link" href="/pricing">Explore placements and pricing</a> · <a className="link" href="/privacy">Privacy</a></p>
    </main><Footer />
  </>;
}
