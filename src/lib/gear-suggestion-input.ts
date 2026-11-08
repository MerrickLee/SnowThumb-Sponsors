export const GEAR_REQUEST_BUCKET = "player-requests";
export const MAX_REQUEST_BYTES = 8192;
export const DAILY_REQUEST_LIMIT = 5;
export type GearSuggestion = {
  request_id: string;
  category: "board" | "binding" | "boot" | "brand";
  idea: string;
  email: string;
  app_version: string;
  platform: string;
};

export function validateGearSuggestion(value: unknown): GearSuggestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  for (const key of ["request_id", "category", "idea", "email", "app_version", "platform"]) {
    if (typeof v[key] !== "string") return null;
  }
  const request_id = String(v.request_id).toLowerCase();
  const idea = String(v.idea).trim(), email = String(v.email).trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(request_id)) return null;
  if (!["board", "binding", "boot", "brand"].includes(String(v.category))) return null;
  if (idea.length < 10 || idea.length > 1000 || /\u0000/.test(idea)) return null;
  if (email.length > 254 || (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return null;
  if (!/^[a-zA-Z0-9.+_-]{1,40}$/.test(String(v.app_version))) return null;
  if (!["IPhonePlayer", "Android", "OSXEditor", "WindowsEditor", "LinuxEditor"].includes(String(v.platform))) return null;
  return { request_id, category: v.category as GearSuggestion["category"], idea, email, app_version: String(v.app_version), platform: String(v.platform) };
}

export async function readLimitedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("empty_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
