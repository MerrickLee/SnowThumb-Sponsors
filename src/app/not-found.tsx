import Link from "next/link";
import { Logo } from "@/components/Brand";

export default function NotFound() {
  return (
    <main id="main" className="flex-1 grid place-items-center px-4 py-16 text-center">
      <div>
        <Logo height={32} />
        <h1 className="title text-3xl mt-8">That run doesn&apos;t exist.</h1>
        <p className="text-muted mt-2">The page you&apos;re looking for moved or never existed.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link className="btn btn-primary" href="/">Go to your console</Link>
          <Link className="btn" href="/apply">Sponsor info</Link>
        </div>
      </div>
    </main>
  );
}
