import Link from "next/link";
import { Logo } from "@/components/Brand";

export default function Thanks() {
  return (
    <main id="main" className="flex-1 grid place-items-center px-4 py-16 text-center">
      <div className="max-w-md">
        <Logo height={30} />
        <p className="eyebrow text-ok mt-8">Application received</p>
        <h1 className="title text-3xl mt-2">Thanks for applying.</h1>
        <p className="text-muted mt-2">We review every sponsor personally. If it&apos;s a fit, you&apos;ll get an email invite to the sponsor console.</p>
        <Link className="btn mt-6" href="/apply">Back to sponsor info</Link>
      </div>
    </main>
  );
}
