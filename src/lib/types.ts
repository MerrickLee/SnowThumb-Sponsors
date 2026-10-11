export type SlotKind = "banner" | "feature_wrap" | "board" | "binding" | "boot" | "event_title";
export type CampaignStatus = "draft" | "submitted" | "approved" | "rejected" | "paused" | "archived";
export type CreativeStatus = "pending" | "approved" | "rejected" | "retired";
export type UnlockType = "free" | "cred" | "score" | "challenge" | "iap";

export const SLOT_KIND_LABEL: Record<SlotKind, string> = {
  banner: "Park banner",
  feature_wrap: "Feature wrap",
  board: "Board graphic",
  binding: "Binding graphic",
  boot: "Boot graphic",
  event_title: "Event title",
};

export type Sponsor = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  is_house: boolean;
  active: boolean;
};

export type Slot = {
  id: string;
  kind: SlotKind;
  label: string;
  description: string | null;
  width: number;
  height: number;
  max_bytes: number;
  base_model_id: string | null;
  template_url: string | null;
  sort: number;
};

export type Campaign = {
  id: string;
  sponsor_id: string;
  name: string;
  status: CampaignStatus;
  link_url: string | null;
  utm_campaign: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  weight: number;
  notes: string | null;
  review_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  requires_payment: boolean;
  paid_at: string | null;
  gear_starts_at: string | null;
  gear_ends_at: string | null;
  board_name: string | null;
  board_tagline: string | null;
  binding_name: string | null;
  binding_tagline: string | null;
  binding_style: "step_on" | "strap" | null;
  binding_frame: string | null;
  binding_strap: string | null;
  binding_accent: string | null;
  boot_name: string | null;
  boot_tagline: string | null;
  boot_shell: string | null;
  boot_trim: string | null;
  boot_laces: string | null;
  boot_sole: string | null;
  created_at: string;
};

export type GearColors = {
  style?: "step_on" | "strap";
  frame?: string;
  strap?: string;
  accent?: string;
  shell?: string;
  trim?: string;
  laces?: string;
  sole?: string;
};

export type GearItem = {
  id: string;
  kind: "board" | "binding" | "boot";
  base_model_id: string;
  name: string;
  tagline: string | null;
  sponsor_id: string | null;
  campaign_id: string | null;
  creative_id: string | null;
  unlock: UnlockType;
  cred_price: number | null;
  score_threshold: number | null;
  iap_product_id: string | null;
  keep_after_end: boolean;
  pro_included: boolean;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  sort: number;
  colors: GearColors | null;
};

export type OrderStatus = "pending" | "paid" | "canceled" | "refunded" | "revoked";

export type CampaignOrder = {
  id: string;
  campaign_id: string;
  sponsor_id: string;
  product: "placements" | "gear";
  term: "day" | "month" | "year";
  days: number;
  start_on: string;
  unit_amount_cents: number;
  amount_cents: number;
  status: OrderStatus;
  window_starts_at: string | null;
  window_ends_at: string | null;
  paid_at: string | null;
  created_at: string;
  promo_code: string | null;
  promotion_code_id: string | null;
  discount_cents: number;
  paid_cents: number | null;
  revoked_at: string | null;
};

export type Creative = {
  id: string;
  campaign_id: string;
  sponsor_id: string;
  slot_id: string;
  status: CreativeStatus;
  upload_path: string;
  public_url: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  review_notes: string | null;
};

export type DailyStat = {
  day: string;
  sponsor_id: string;
  campaign_id: string | null;
  creative_id: string | null;
  slot_id: string | null;
  gear_item_id: string | null;
  impressions: number;
  view_ms: number;
  unique_installs: number;
  gear_views: number;
  gear_unlocks: number;
  gear_equips: number;
  runs_with_gear: number;
  challenge_starts: number;
  challenge_completes: number;
  clicks: number;
};
