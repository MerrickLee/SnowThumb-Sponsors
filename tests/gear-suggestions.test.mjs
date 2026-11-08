import test from "node:test";
import assert from "node:assert/strict";
import { validateGearSuggestion, readLimitedJson } from "../src/lib/gear-suggestion-input.ts";
import { reserveRequestSlot } from "../src/lib/gear-suggestion-limit.ts";

const valid = { request_id: "59f6f535-44cd-43ec-9459-c22dcce3d21e", category: "board", idea: "A bright blue mountain board", email: "", app_version: "1.4", platform: "IPhonePlayer" };
test("optional email and multiline ideas work without adding identity fields", () => {
  assert.deepEqual(validateGearSuggestion({ ...valid, idea: "  Blue board\nwith stars  ", unknown: "ignored" }), { ...valid, idea: "Blue board\nwith stars" });
  assert.equal(validateGearSuggestion({ ...valid, email: "reply@example.invalid" }).email, "reply@example.invalid");
});
test("invalid and oversized request fields are rejected", () => {
  for (const patch of [{ request_id: "../../secret" }, { category: "script" }, { idea: "short" }, { idea: "x".repeat(1001) }, { email: "email\r\n@bad.com" }, { app_version: "x".repeat(41) }, { platform: "Web" }, { idea: 12 }]) assert.equal(validateGearSuggestion({ ...valid, ...patch }), null);
  for (const input of [null, [], "idea", {}]) assert.equal(validateGearSuggestion(input), null);
});
test("body cap is enforced without trusting Content-Length", async () => {
  const request = (body) => new Request("https://example.invalid", { method: "POST", body });
  assert.deepEqual(await readLimitedJson(request(JSON.stringify(valid))), valid);
  await assert.rejects(readLimitedJson(request("x".repeat(8193))), /body_too_large/);
  await assert.rejects(readLimitedJson(request("{bad json")));
});
function memoryStore() {
  const files = new Map();
  return { files, async put(path, body) { if (files.has(path)) return "exists"; files.set(path, body); return "created"; }, async read(path) { return files.get(path) ?? null; } };
}
test("five distinct requests fit; the sixth is rejected", async () => {
  const store = memoryStore();
  for (let i = 0; i < 5; i++) assert.equal(await reserveRequestSlot(store, "day/ip", String(i), 5), true);
  assert.equal(await reserveRequestSlot(store, "day/ip", "sixth", 5), false);
  assert.equal(store.files.size, 5);
});
test("concurrent retries reserve only one slot", async () => {
  const store = memoryStore();
  const replies = await Promise.all(Array.from({ length: 20 }, () => reserveRequestSlot(store, "day/ip", "same-request", 5)));
  assert.equal(replies.every(Boolean), true);
  assert.equal(store.files.size, 1);
});
test("concurrent distinct requests cannot exceed the durable cap", async () => {
  const store = memoryStore();
  const replies = await Promise.all(Array.from({ length: 20 }, (_, i) => reserveRequestSlot(store, "day/ip", String(i), 5)));
  assert.equal(replies.filter(Boolean).length, 5);
  assert.equal(store.files.size, 5);
});
test("a failed inbox write can reuse its reserved slot", async () => {
  const store = memoryStore();
  assert.equal(await reserveRequestSlot(store, "day/ip", "retry", 5), true);
  assert.equal(await reserveRequestSlot(store, "day/ip", "retry", 5), true);
  assert.equal(store.files.size, 1);
});
