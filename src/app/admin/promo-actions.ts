"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Promo codes live in Stripe (Product catalog > Coupons > Promotion codes). These actions
// let an admin shut one off and take back what it was used for, without opening Stripe.

const refresh = () => { revalidatePath("/admin/promos"); revalidatePath("/admin/campaigns"); };

/** Stops a code working at checkout. Campaigns that already used it keep their days. */
export async function deactivatePromo(form: FormData) {
  await requireAdmin();
  await getStripe().promotionCodes.update(String(form.get("promotion_code_id")), { active: false });
  refresh();
}

/** Turns a deactivated code back on. */
export async function reactivatePromo(form: FormData) {
  await requireAdmin();
  await getStripe().promotionCodes.update(String(form.get("promotion_code_id")), { active: true });
  refresh();
}

/** Takes back one order bought with a code: its days come off the campaign. */
export async function revokePromoOrder(form: FormData) {
  const s = await requireAdmin();
  const { error } = await createAdminClient().rpc("revoke_campaign_order", { p_order: String(form.get("order_id")), p_by: s.userId });
  if (error) throw new Error(error.message);
  refresh();
}

/** Compromised code: switch it off in Stripe and take back every order that used it, from every sponsor. */
export async function revokePromoEverywhere(form: FormData) {
  const s = await requireAdmin();
  const id = String(form.get("promotion_code_id")), code = String(form.get("code"));
  await getStripe().promotionCodes.update(id, { active: false });
  const { error } = await createAdminClient().rpc("revoke_promo_code_orders", { p_code: code, p_by: s.userId });
  if (error) throw new Error(error.message);
  refresh();
}
