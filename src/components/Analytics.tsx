"use client";

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_ID, getConsent, setConsent, start, track, type Consent } from "@/lib/analytics";

const PRIVATE = /^\/(admin|portal|auth)/;

function PageViews() {
  const path = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    const qs = params.toString();
    // Logged-in pages go to Amplitude only; GA4 gets the public site.
    const props = { path, query: PRIVATE.test(path) ? undefined : qs || undefined };
    if (PRIVATE.test(path)) {
      // track() only forwards GA_EVENTS to GA4; use a non-GA name for console pages.
      track("console_page_view", { path });
    } else {
      track("page_view", { ...props, page_location: window.location.href, page_title: document.title });
    }
  }, [path, params]);
  return null;
}

export function Analytics() {
  const [consent, setLocal] = useState<Consent>("granted"); // assume decided until we can read storage

  useEffect(() => {
    const read = () => setLocal(getConsent());
    read();
    start();
    window.addEventListener("st-consent", read);
    return () => window.removeEventListener("st-consent", read);
  }, []);

  return (
    <>
      {/* Consent Mode v2: everything denied until the visitor accepts. */}
      <Script id="ga-consent" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        var c = null; try { c = localStorage.getItem('st_consent'); } catch (e) {}
        var g = c === 'granted' ? 'granted' : 'denied';
        gtag('consent', 'default', { analytics_storage: g, ad_storage: g, ad_user_data: g, ad_personalization: 'denied', wait_for_update: 500 });
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { send_page_view: false });
      `}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Suspense><PageViews /></Suspense>
      {consent === null && <ConsentBanner />}
    </>
  );
}

function ConsentBanner() {
  return (
    <div role="region" aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl card p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <p className="text-sm text-muted flex-1">
          We use analytics cookies (Google Analytics and Amplitude) to see how sponsors find and use this site. No ads, and nothing is sold.{" "}
          <a className="link" href="/privacy">Privacy</a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="btn btn-sm" onClick={() => setConsent("denied")}>Decline</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setConsent("granted"); track("page_view", { path: window.location.pathname, page_location: window.location.href, page_title: document.title }); }}>Accept</button>
        </div>
      </div>
    </div>
  );
}
