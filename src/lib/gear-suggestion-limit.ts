export interface SlotStore {
  put(path: string, body: string): Promise<"created" | "exists">;
  read(path: string): Promise<string | null>;
}

/** Fixed, atomic slots enforce the cap even across concurrent server instances.
 * Retries reuse their reservation, including a retry after the inbox write failed.
 */
export async function reserveRequestSlot(store: SlotStore, prefix: string, requestId: string, limit: number): Promise<boolean> {
  for (let slot = 0; slot < limit; slot++) {
    const path = `${prefix}/${slot}.json`;
    const result = await store.put(path, JSON.stringify({ request_id: requestId }));
    if (result === "created") return true;
    const saved = await store.read(path);
    try { if (saved && JSON.parse(saved).request_id === requestId) return true; }
    catch { /* A corrupt occupied slot never becomes an extra quota slot. */ }
  }
  return false;
}
