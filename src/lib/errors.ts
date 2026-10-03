/** Turns Postgres/PostgREST errors into something a sponsor can act on. */
export function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("campaigns_check") || m.includes("ends_at")) return "The end date needs to be after the start date.";
  if (m.includes("link_url")) return "The link must be a full https:// address.";
  if (m.includes("row-level security") || m.includes("permission denied")) return "You don't have access to change that. If this seems wrong, email sponsors@snowthumb.com.";
  if (m.includes("duplicate key")) return "That already exists.";
  if (m.includes("jwt") || m.includes("session")) return "Your session expired. Sign in again.";
  return message;
}
