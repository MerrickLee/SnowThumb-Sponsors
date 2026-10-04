"use client";

// One door for analytics. Pages call track()/identify(); this file decides
// what goes to GA4 (marketing events only) and what goes to Amplitude (everything).
// Nothing is sent until the visitor accepts the consent banner.
import * as amplitude from "@amplitude/analytics-browser";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-1BPJWV86P6";
const AMP_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? "0fe2dadd8b57c58c8c715dffca892e62";
const CONSENT_KEY = "st_consent";

/** Events GA4 also receives. Everything after sign-in stays in Amplitude only. */
const GA_EVENTS: Record<string, string> = {
  page_view: "page_view",
  placement_viewed: "placement_viewed",
  template_downloaded: "template_downloaded",
  apply_started: "apply_started",
  apply_submitted: "generate_lead",
};

type Props = Record<string, string | number | boolean | string[] | null | undefined>;
type Gtag = (...args: unknown[]) => void;
declare global { interface Window { gtag?: Gtag; dataLayer?: unknown[] } }

let started = false;

/** Sets up gtag and Consent Mode defaults before any event, even if gtag.js hasn't loaded yet. */
export function ensureGtag() {
  if (typeof window === "undefined" || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  // gtag.js reads the queued `arguments` objects in order once it loads.
  window.gtag = function gtag() { // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const g = getConsent() === "granted" ? "granted" : "denied";
  window.gtag("consent", "default", { analytics_storage: g, ad_storage: g, ad_user_data: g, ad_personalization: "denied", wait_for_update: 500 });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

export type Consent = "granted" | "denied" | null;

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch { return null; }
}

export function setConsent(value: "granted" | "denied") {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode */ }
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: "denied", // never used for ad personalisation
  });
  if (value === "granted") start();
  else amplitude.setOptOut(true);
  window.dispatchEvent(new Event("st-consent"));
}

/** Starts Amplitude once consent is granted. Safe to call repeatedly. */
export function start() {
  if (started || typeof window === "undefined" || getConsent() !== "granted") return;
  started = true;
  amplitude.init(AMP_KEY, {
    serverZone: "US",
    defaultTracking: false, // page views are sent by hand on route changes
    autocapture: { attribution: true, sessions: true, pageViews: false, formInteractions: false, elementInteractions: false, fileDownloads: false },
  });
  amplitude.setOptOut(false);
}

export function track(event: string, props: Props = {}) {
  if (getConsent() !== "granted") return;
  start();
  amplitude.track(event, props);
  ensureGtag();
  const ga = GA_EVENTS[event];
  if (ga && window.gtag) window.gtag("event", ga, props);
}

/** Ties this browser to a signed-in user (Supabase UUID, never the email). */
export function identify(userId: string, role: "admin" | "sponsor", sponsorIds: string[]) {
  if (getConsent() !== "granted") return;
  start();
  if (amplitude.getUserId() !== userId) amplitude.setUserId(userId);
  const id = new amplitude.Identify().set("role", role);
  amplitude.identify(id);
  if (sponsorIds.length) amplitude.setGroup("sponsor", sponsorIds);
}

export function reset() {
  if (started) amplitude.reset();
}

/** The device ID, saved with an application so its history joins the account later. */
export function deviceId(): string | undefined {
  return started ? amplitude.getDeviceId() : undefined;
}
